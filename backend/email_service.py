import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from typing import List

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'noreply@proyecthub.com')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'ProyectHub')
EMAIL_NOTIFICATIONS_ENABLED = os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'false').lower() == 'true'

async def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Send an email using SMTP"""
    
    if not EMAIL_NOTIFICATIONS_ENABLED:
        logger.info(f"Email notifications disabled. Would send to {to_email}: {subject}")
        return False
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured")
        return False
    
    try:
        message = MIMEMultipart('alternative')
        message['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        message['To'] = to_email
        message['Subject'] = subject
        
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            message.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        message.attach(part2)
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def get_task_assigned_email(user_name: str, task_title: str, project_name: str, assigner_name: str):
    """Generate HTML email for task assignment"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Nueva Tarea Asignada</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{user_name}</strong>,</p>
                <p><strong>{assigner_name}</strong> te ha asignado una nueva tarea:</p>
                <h2 style="color: #2563EB;">{task_title}</h2>
                <p><strong>Proyecto:</strong> {project_name}</p>
                <p>Inicia sesión en ProyectHub para ver los detalles y comenzar a trabajar.</p>
                <a href="#" class="button">Ver Tarea</a>
            </div>
            <div class="footer">
                <p>Este es un correo automático de ProyectHub. Por favor no respondas a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    Nueva Tarea Asignada
    
    Hola {user_name},
    
    {assigner_name} te ha asignado una nueva tarea:
    {task_title}
    
    Proyecto: {project_name}
    
    Inicia sesión en ProyectHub para ver los detalles.
    """
    
    return html, text

def get_task_completed_email(user_name: str, task_title: str, project_name: str, completer_name: str):
    """Generate HTML email for task completion"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Tarea Completada</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{user_name}</strong>,</p>
                <p><strong>{completer_name}</strong> ha completado la tarea:</p>
                <h2 style="color: #10B981;">{task_title}</h2>
                <p><strong>Proyecto:</strong> {project_name}</p>
                <p>¡Excelente trabajo del equipo!</p>
            </div>
            <div class="footer">
                <p>Este es un correo automático de ProyectHub. Por favor no respondas a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    Tarea Completada
    
    Hola {user_name},
    
    {completer_name} ha completado la tarea:
    {task_title}
    
    Proyecto: {project_name}
    
    ¡Excelente trabajo del equipo!
    """
    
    return html, text

def get_comment_email(user_name: str, project_name: str, commenter_name: str, comment_content: str):
    """Generate HTML email for new comment"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
            .comment {{ background-color: white; padding: 15px; border-left: 4px solid #8B5CF6; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💬 Nuevo Comentario</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{user_name}</strong>,</p>
                <p><strong>{commenter_name}</strong> comentó en <strong>{project_name}</strong>:</p>
                <div class="comment">
                    {comment_content}
                </div>
            </div>
            <div class="footer">
                <p>Este es un correo automático de ProyectHub. Por favor no respondas a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    Nuevo Comentario
    
    Hola {user_name},
    
    {commenter_name} comentó en {project_name}:
    
    {comment_content}
    """
    
    return html, text
