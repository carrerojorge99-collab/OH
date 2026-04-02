# Backend: Cost Estimate PDF Export
# Extracted from backend/server.py lines 12034-12578

@api_router.get("/cost-estimates/{estimate_id}/export/pdf")
async def export_cost_estimate_pdf(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_RIGHT
    import io
    import base64
    
    user = await get_current_user(request, session_token)
    
    estimate = await db.cost_estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimación no encontrada")
    
    # Get company info
    company = await db.company.find_one({}, {"_id": 0}) or {}
    
    # Define corporate colors matching frontend/invoice
    PRIMARY_COLOR = colors.HexColor('#f97316')  # Orange
    SECONDARY_COLOR = colors.HexColor('#475569')  # Slate
    TEXT_COLOR = colors.HexColor('#1e293b')  # Dark
    LIGHT_BG = colors.HexColor('#f8fafc')  # Light gray
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom styles matching invoice CSS
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=TEXT_COLOR, spaceAfter=5, alignment=2)  # Right aligned
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, textColor=PRIMARY_COLOR, fontName='Helvetica-Bold')
    company_detail_style = ParagraphStyle('CompanyDetail', parent=styles['Normal'], fontSize=8, textColor=SECONDARY_COLOR)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=11, textColor=TEXT_COLOR, spaceAfter=8, spaceBefore=15, fontName='Helvetica-Bold')
    normal_right = ParagraphStyle('NormalRight', parent=styles['Normal'], alignment=2)
    subtitle_right = ParagraphStyle('SubtitleRight', parent=styles['Normal'], fontSize=9, textColor=SECONDARY_COLOR, alignment=2)
    
    elements = []
    
    # Build header table with logo on left, doc info on right (matching invoice style)
    # Left side: Company logo and info
    left_elements = []
    
    # Try to load company logo
    logo_path = None
    if company.get('company_logo'):
        logo_url = company.get('company_logo', '')
        if logo_url.startswith('/api/uploads/'):
            logo_path = ROOT_DIR / logo_url.replace('/api/uploads/', 'uploads/')
        elif logo_url.startswith('/uploads/'):
            logo_path = ROOT_DIR / logo_url.lstrip('/')
    
    if logo_path and logo_path.exists():
        try:
            logo_img = Image(str(logo_path), width=1.5*inch, height=0.75*inch)
            left_elements.append(logo_img)
            left_elements.append(Spacer(1, 5))
        except:
            pass
    
    # Company name and details
    company_name = company.get('company_name', 'OHSMS PR')
    left_elements.append(Paragraph(company_name, company_style))
    
    if company.get('address'):
        left_elements.append(Paragraph(company.get('address', ''), company_detail_style))
    if company.get('city') or company.get('state'):
        left_elements.append(Paragraph(f"{company.get('city', '')}, {company.get('state', '')} {company.get('zip_code', '')}", company_detail_style))
    if company.get('phone'):
        left_elements.append(Paragraph(f"Tel: {company.get('phone', '')}", company_detail_style))
    if company.get('email'):
        left_elements.append(Paragraph(company.get('email', ''), company_detail_style))
    
    # Right side: Document title and info
    right_elements = []
    right_elements.append(Paragraph("COST ESTIMATE", title_style))
    right_elements.append(Paragraph(f"#{estimate.get('estimate_name', 'Untitled')}", subtitle_right))
    right_elements.append(Paragraph(f"Project: {estimate.get('project_name', 'N/A')}", subtitle_right))
    right_elements.append(Paragraph(f"Date: {datetime.now(PUERTO_RICO_TZ).strftime('%m/%d/%Y')}", subtitle_right))
    
    # Create header table with two columns
    from reportlab.platypus import KeepTogether
    header_table_data = [[left_elements, right_elements]]
    header_table = Table(header_table_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    
    # Orange separator line
    elements.append(Spacer(1, 10))
    line_table = Table([['']], colWidths=[7*inch])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 1, PRIMARY_COLOR),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 15))
    
    # Summary Section with orange accent - CASCADING CALCULATION
    elements.append(Spacer(1, 20))
    
    # Section title with border
    summary_title_style = ParagraphStyle(
        'SummaryTitle', 
        parent=styles['Heading2'], 
        fontSize=12, 
        textColor=colors.white, 
        fontName='Helvetica-Bold',
        backColor=PRIMARY_COLOR,
        borderPadding=(8, 8, 8, 8),
        spaceBefore=0,
        spaceAfter=0
    )
    
    # Helper function to round to 2 decimals
    def round2(num):
        return round(num * 100) / 100
    
    # Get raw data from estimate
    labor_costs = estimate.get('labor_costs', [])
    subcontractors = estimate.get('subcontractors', [])
    materials = estimate.get('materials', [])
    equipment = estimate.get('equipment', [])
    transportation = estimate.get('transportation', [])
    general_conditions = estimate.get('general_conditions', [])
    
    # Calculate totals from line items
    total_labor = round2(sum(float(item.get('subtotal', 0)) for item in labor_costs))
    
    # Calculate subcontractor total with factor applied
    total_subcontractors_raw = round2(sum(
        float(item.get("cost", 0)) * (1 + float(item.get("factor", 0)) / 100) 
        for item in subcontractors
    ))
    
    # Subcontractor distribution: 70% to Materials, 30% to Labor
    subcontractor_to_materials = round2(total_subcontractors_raw * 0.70)
    subcontractor_to_labor = round2(total_subcontractors_raw * 0.30)
    
    # Labor from subcontractors (30%) for B2B calculation
    total_subcontractor_labor = subcontractor_to_labor
    
    direct_materials = round2(sum(float(item.get('total', 0)) for item in materials))
    total_materials = round2(direct_materials + subcontractor_to_materials)
    
    # Total labor including 30% from subcontractors
    total_labor_with_subcontractors = round2(total_labor + subcontractor_to_labor)
    
    total_equipment = round2(sum(float(item.get('total', 0)) for item in equipment))
    total_transportation = round2(sum(float(item.get('total', 0)) for item in transportation))
    total_gc = round2(sum(float(item.get('total', 0)) for item in general_conditions))
    
    # Subtotal now uses distributed values
    subtotal = round2(total_labor_with_subcontractors + total_materials + 
                      total_equipment + total_transportation + total_gc)
    
    # Get percentages
    profit_pct = float(estimate.get('profit_percentage', 0))
    overhead_pct = float(estimate.get('overhead_percentage', 0))
    cfse_pct = float(estimate.get('cfse_percentage', 0))
    liability_pct = float(estimate.get('liability_percentage', 0))
    municipal_patent_pct = float(estimate.get('municipal_patent_percentage', 0))
    contingency_pct = float(estimate.get('contingency_percentage', 0))
    b2b_ohsms_pct = float(estimate.get('b2b_ohsms_percentage', 0))
    b2b_ohsms_labor_pct = float(estimate.get('b2b_ohsms_labor_percentage', 0))
    b2b_subcontractor_pct = float(estimate.get('b2b_subcontractor_percentage', 0))
    
    # Get include flags - if checkbox is unchecked, treat percentage as 0 for calculations
    include_profit = estimate.get('include_profit', True)
    include_overhead = estimate.get('include_overhead', True)
    include_cfse = estimate.get('include_cfse', True)
    include_liability = estimate.get('include_liability', True)
    include_municipal_patent = estimate.get('include_municipal_patent', True)
    include_contingency = estimate.get('include_contingency', True)
    include_b2b_ohsms = estimate.get('include_b2b_ohsms', True)
    include_b2b_ohsms_labor = estimate.get('include_b2b_ohsms_labor', True)
    include_b2b_subcontractor = estimate.get('include_b2b_subcontractor', True)
    
    # Apply include flags - if not included, treat as 0% for calculations
    effective_profit_pct = profit_pct if include_profit else 0
    effective_overhead_pct = overhead_pct if include_overhead else 0
    effective_cfse_pct = cfse_pct if include_cfse else 0
    effective_liability_pct = liability_pct if include_liability else 0
    effective_municipal_patent_pct = municipal_patent_pct if include_municipal_patent else 0
    effective_contingency_pct = contingency_pct if include_contingency else 0
    effective_b2b_ohsms_pct = b2b_ohsms_pct if include_b2b_ohsms else 0
    effective_b2b_ohsms_labor_pct = b2b_ohsms_labor_pct if include_b2b_ohsms_labor else 0
    effective_b2b_subcontractor_pct = b2b_subcontractor_pct if include_b2b_subcontractor else 0
    
    # CASCADING CALCULATION matching frontend exactly:
    # B2B Subcontractor - applies only to subcontractor's LABOR COST (30% of subcontractor cost)
    b2b_subcontractor_amount = round2(total_subcontractor_labor * (effective_b2b_subcontractor_pct / 100))
    
    # Step 1: Subtotal x (1 + Profit%) = s
    profit_multiplier = 1 + (effective_profit_pct / 100)
    after_profit = round2(subtotal * profit_multiplier)
    profit_amount = round2(after_profit - subtotal)
    
    # Step 2: s x (1 + Overhead%) = w
    overhead_multiplier = 1 + (effective_overhead_pct / 100)
    after_overhead = round2(after_profit * overhead_multiplier)
    overhead_amount = round2(after_overhead - after_profit)
    
    # Step 3: Mano de Obra x CFSE% = cfseAmount (uses total labor including 30% from subcontractors)
    cfse_amount = round2(total_labor_with_subcontractors * (effective_cfse_pct / 100))
    
    # Step 4: w + cfseAmount = qq
    combined_total = round2(after_overhead + cfse_amount)
    
    # Step 5: qq x (1 + Liability%) = M
    liability_multiplier = 1 + (effective_liability_pct / 100)
    after_liability = round2(combined_total * liability_multiplier)
    liability_amount = round2(after_liability - combined_total)
    
    # Step 6: M x (1 + Municipal Patent%) = C
    municipal_patent_multiplier = 1 + (effective_municipal_patent_pct / 100)
    after_municipal_patent = round2(after_liability * municipal_patent_multiplier)
    municipal_patent_amount = round2(after_municipal_patent - after_liability)
    
    # Step 7: C x (1 + Contingency%) = U
    contingency_multiplier = 1 + (effective_contingency_pct / 100)
    after_contingency = round2(after_municipal_patent * contingency_multiplier)
    contingency_amount = round2(after_contingency - after_municipal_patent)
    
    # Step 8: U x 0.35 x B2B OHSMS% = B2B OHSMS Amount
    b2b_ohsms_base = round2(after_contingency * 0.35)
    b2b_ohsms_amount = round2(b2b_ohsms_base * (effective_b2b_ohsms_pct / 100))
    after_b2b_ohsms = round2(after_contingency + b2b_ohsms_amount)
    
    # Calculate Material/Equipment breakdown (materials now includes 70% of subcontractors)
    total_material_equipment = round2(total_materials + total_equipment + total_transportation + total_gc)
    
    # Calculate Labor ratio and Labor for Price Breakdown (labor includes 30% from subcontractors)
    labor_ratio = total_labor_with_subcontractors / subtotal if subtotal > 0 else 0
    mat_equip_ratio = total_material_equipment / subtotal if subtotal > 0 else 0
    
    # Labor del Price Breakdown = after_b2b_ohsms * labor_ratio (CFSE ya está en cascade)
    labor_for_price_breakdown = round2(after_b2b_ohsms * labor_ratio)
    
    # B2B OHSMS Labor = Labor (del Price Breakdown) × 4% (only if included)
    b2b_ohsms_labor_amount = round2(labor_for_price_breakdown * (effective_b2b_ohsms_labor_pct / 100))
    
    # Final total = cascaded total + B2B subcontractor (labor) + B2B OHSMS (labor)
    grand_total = round2(after_b2b_ohsms + b2b_subcontractor_amount + b2b_ohsms_labor_amount)
    
    # Labor with percentages = Labor proporción + B2B OHSMS Labor
    labor_with_percentages = round2(labor_for_price_breakdown + b2b_ohsms_labor_amount)
    # Material/Equipment with percentages = proporción mat/equip del cascade + B2B Subcontractor
    mat_equip_with_percentages = round2((after_b2b_ohsms * mat_equip_ratio) + b2b_subcontractor_amount)
    
    # Calculate total company margins/charges
    total_company_charges = round2(
        profit_amount + overhead_amount + cfse_amount + liability_amount + 
        municipal_patent_amount + contingency_amount + b2b_ohsms_amount + 
        b2b_ohsms_labor_amount + b2b_subcontractor_amount
    )
    
    # ==================== SECTION 1: DIRECT PROJECT COSTS ====================
    # Header for direct costs section
    direct_costs_header = Table([['DIRECT PROJECT COSTS']], colWidths=[6.5*inch])
    direct_costs_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
    ]))
    elements.append(direct_costs_header)
    elements.append(Spacer(1, 5))
    
    # Direct costs table
    direct_costs_data = [
        ['Category', 'Amount'],
        ['Direct Labor', f"${total_labor:,.2f}"],
        ['Subcontractors', f"${total_subcontractors_raw:,.2f}"],
        ['Materials', f"${direct_materials:,.2f}"],
        ['Equipment', f"${total_equipment:,.2f}"],
        ['Transportation', f"${total_transportation:,.2f}"],
        ['General Conditions', f"${total_gc:,.2f}"],
    ]
    
    direct_costs_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, PRIMARY_COLOR),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fcfcfd')]),
    ])
    
    t_direct = Table(direct_costs_data, colWidths=[4.5*inch, 2*inch])
    t_direct.setStyle(direct_costs_style)
    elements.append(t_direct)
    
    # Subtotal row
    subtotal_data = [['DIRECT COSTS SUBTOTAL', f"${subtotal:,.2f}"]]
    subtotal_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_COLOR),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
    ])
    t_subtotal = Table(subtotal_data, colWidths=[4.5*inch, 2*inch])
    t_subtotal.setStyle(subtotal_style)
    elements.append(t_subtotal)
    
    # ==================== SECTION 2: MANDATORY CHARGES ====================
    elements.append(Spacer(1, 15))
    
    # Header for mandatory charges section
    mandatory_charges_header = Table([['MANDATORY CHARGES & EXPENSES']], colWidths=[6.5*inch])
    mandatory_charges_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
    ]))
    elements.append(mandatory_charges_header)
    elements.append(Spacer(1, 5))
    
    # Mandatory charges table (Overhead, CFSE, Liability, etc. - NOT Profit)
    mandatory_charges_data = [['Item', 'Rate', 'Amount']]
    total_mandatory_charges = 0
    
    # Check include flags for each percentage
    include_overhead = estimate.get('include_overhead', True)
    include_cfse = estimate.get('include_cfse', True)
    include_liability = estimate.get('include_liability', True)
    include_municipal_patent = estimate.get('include_municipal_patent', True)
    include_contingency = estimate.get('include_contingency', True)
    include_b2b_ohsms = estimate.get('include_b2b_ohsms', True)
    include_b2b_ohsms_labor = estimate.get('include_b2b_ohsms_labor', True)
    include_b2b_subcontractor = estimate.get('include_b2b_subcontractor', True)
    
    if overhead_pct > 0 and include_overhead:
        mandatory_charges_data.append(['Overhead', f"{overhead_pct}%", f"${overhead_amount:,.2f}"])
        total_mandatory_charges += overhead_amount
    
    if cfse_pct > 0 and include_cfse:
        mandatory_charges_data.append(['CFSE (Labor Only)', f"{cfse_pct}%", f"${cfse_amount:,.2f}"])
        total_mandatory_charges += cfse_amount
    
    if liability_pct > 0 and include_liability:
        mandatory_charges_data.append(['Liability Insurance', f"{liability_pct}%", f"${liability_amount:,.2f}"])
        total_mandatory_charges += liability_amount
    
    if municipal_patent_pct > 0 and include_municipal_patent:
        mandatory_charges_data.append(['Municipal Patent', f"{municipal_patent_pct}%", f"${municipal_patent_amount:,.2f}"])
        total_mandatory_charges += municipal_patent_amount
    
    if contingency_pct > 0 and include_contingency:
        mandatory_charges_data.append(['Contingency', f"{contingency_pct}%", f"${contingency_amount:,.2f}"])
        total_mandatory_charges += contingency_amount
    
    if b2b_ohsms_pct > 0 and include_b2b_ohsms:
        mandatory_charges_data.append(['B2B OHSMS Global', f"{b2b_ohsms_pct}%", f"${b2b_ohsms_amount:,.2f}"])
        total_mandatory_charges += b2b_ohsms_amount
    
    if b2b_ohsms_labor_pct > 0 and include_b2b_ohsms_labor:
        mandatory_charges_data.append(['B2B OHSMS Labor', f"{b2b_ohsms_labor_pct}%", f"${b2b_ohsms_labor_amount:,.2f}"])
        total_mandatory_charges += b2b_ohsms_labor_amount
    
    if b2b_subcontractor_pct > 0 and total_subcontractor_labor > 0 and include_b2b_subcontractor:
        mandatory_charges_data.append(['B2B Subcontractor', f"{b2b_subcontractor_pct}%", f"${b2b_subcontractor_amount:,.2f}"])
        total_mandatory_charges += b2b_subcontractor_amount
    
    # Only show section if there are mandatory charges
    if len(mandatory_charges_data) > 1:
        mandatory_charges_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, SECONDARY_COLOR),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fcfcfd')]),
        ])
        
        t_mandatory = Table(mandatory_charges_data, colWidths=[3.5*inch, 1.5*inch, 1.5*inch])
        t_mandatory.setStyle(mandatory_charges_style)
        elements.append(t_mandatory)
        
        # Total mandatory charges row
        total_mandatory_data = [['TOTAL MANDATORY CHARGES', '', f"${total_mandatory_charges:,.2f}"]]
        total_mandatory_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_COLOR),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (-1, 0), (-1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
        ])
        t_total_mandatory = Table(total_mandatory_data, colWidths=[3.5*inch, 1.5*inch, 1.5*inch])
        t_total_mandatory.setStyle(total_mandatory_style)
        elements.append(t_total_mandatory)
    
    # ==================== SECTION 3: COMPANY PROFIT ====================
    if profit_pct > 0 and include_profit:
        elements.append(Spacer(1, 15))
        
        # Header for profit section
        profit_header = Table([['COMPANY PROFIT']], colWidths=[6.5*inch])
        profit_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),  # Green
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
        ]))
        elements.append(profit_header)
        elements.append(Spacer(1, 5))
        
        # Profit table
        profit_data = [
            ['Item', 'Rate', 'Amount'],
            ['Profit', f"{profit_pct}%", f"${profit_amount:,.2f}"]
        ]
        
        profit_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d1fae5')),  # Light green
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#065f46')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#059669')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f0fdf4')),
        ])
        
        t_profit = Table(profit_data, colWidths=[3.5*inch, 1.5*inch, 1.5*inch])
        t_profit.setStyle(profit_style)
        elements.append(t_profit)
        
        # Total profit row
        total_profit_data = [['TOTAL PROFIT', '', f"${profit_amount:,.2f}"]]
        total_profit_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (-1, 0), (-1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
        ])
        t_total_profit = Table(total_profit_data, colWidths=[3.5*inch, 1.5*inch, 1.5*inch])
        t_total_profit.setStyle(total_profit_style)
        elements.append(t_total_profit)
    
    # ==================== SECTION 4: FINAL SUMMARY ====================
    elements.append(Spacer(1, 20))
    
    # Material/Equipment | Labor | Total breakdown
    breakdown_header = [['Material/Equipment', 'Labor', 'Total']]
    breakdown_data = [[f"${mat_equip_with_percentages:,.2f}", f"${labor_with_percentages:,.2f}", f"${grand_total:,.2f}"]]
    
    breakdown_header_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
    ])
    
    breakdown_data_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
    ])
    
    th = Table(breakdown_header, colWidths=[2.17*inch, 2.17*inch, 2.17*inch])
    th.setStyle(breakdown_header_style)
    
    td = Table(breakdown_data, colWidths=[2.17*inch, 2.17*inch, 2.17*inch])
    td.setStyle(breakdown_data_style)
    
    elements.append(th)
    elements.append(td)
    
    # Grand total with orange background
    elements.append(Spacer(1, 10))
    total_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
    ])
    
    total_data = [['GRAND TOTAL', f"${grand_total:,.2f}"]]
    tt = Table(total_data, colWidths=[4*inch, 2.5*inch])
    tt.setStyle(total_style)
    
    elements.append(tt)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"estimacion_{estimate_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
