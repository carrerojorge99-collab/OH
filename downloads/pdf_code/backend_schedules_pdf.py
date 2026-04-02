# Backend: Schedules PDF Export
# Extracted from backend/server.py lines 14589-14679

@api_router.get("/schedules/export/pdf")
async def export_schedules_pdf(
    request: Request,
    project_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Export schedules to PDF"""
    user = await get_current_user(request, session_token)
    
    query = {"project_id": project_id}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    shifts = await db.schedules.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    
    # Get company settings for branding
    company_settings = await db.company_settings.find_one({}, {"_id": 0})
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af')
    )
    
    elements = []
    
    # Title
    company_name = company_settings.get("company_name", "Empresa") if company_settings else "Empresa"
    elements.append(Paragraph(f"{company_name}", title_style))
    elements.append(Paragraph(f"Programacion de Turnos - {project.get('name', 'Proyecto')}", styles['Heading2']))
    elements.append(Spacer(1, 20))
    
    # Table data
    data = [["Fecha", "Horario", "Descripcion", "Capacidad", "Asignados"]]
    
    for shift in shifts:
        confirmed = [a for a in shift.get("assignments", []) if a.get("status") == "confirmed"]
        time_range = f"{shift.get('start_time')} - {shift.get('end_time')}"
        assigned_names = ", ".join([a.get("user_name", "") for a in confirmed]) or "Sin asignar"
        
        data.append([
            shift.get("date"),
            time_range,
            shift.get("description", "")[:30] or "-",
            str(shift.get("max_slots")),
            assigned_names[:40]
        ])
    
    # Create table
    table = Table(data, colWidths=[80, 100, 150, 60, 150])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=schedule_{project_id}.pdf"}
    )
