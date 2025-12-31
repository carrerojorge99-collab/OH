import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from typing import List
from pathlib import Path

logger = logging.getLogger(__name__)

def get_smtp_config():
    """Get SMTP configuration from .env file or environment variables"""
    env_values = {}
    env_path = Path("/app/backend/.env")
    
    if env_path.exists():
        try:
            for line in env_path.read_text().split('\n'):
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    value = value.strip().strip('"').strip("'")
                    env_values[key] = value
        except Exception as e:
            logger.warning(f"Error reading .env file: {e}")
    
    return {
        'host': env_values.get('SMTP_HOST', os.environ.get('SMTP_HOST', 'smtp.gmail.com')),
        'port': int(env_values.get('SMTP_PORT', os.environ.get('SMTP_PORT', 587))),
        'user': env_values.get('SMTP_USER', os.environ.get('SMTP_USER', '')),
        'password': env_values.get('SMTP_PASSWORD', os.environ.get('SMTP_PASSWORD', '')),
        'from_email': env_values.get('SMTP_FROM_EMAIL', os.environ.get('SMTP_FROM_EMAIL', 'noreply@promanage.com')),
        'from_name': env_values.get('SMTP_FROM_NAME', os.environ.get('SMTP_FROM_NAME', 'ProManage')),
        'enabled': env_values.get('EMAIL_NOTIFICATIONS_ENABLED', os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'false')).lower() == 'true',
        'app_url': env_values.get('APP_URL', os.environ.get('APP_URL', 'https://promanage.ohsmspr.com'))
    }

# Legacy variables for backward compatibility - these can be updated at runtime
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'noreply@promanage.com')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'ProManage')
EMAIL_NOTIFICATIONS_ENABLED = os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'false').lower() == 'true'

async def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Send an email using SMTP"""
    
    # Always read fresh config from .env file
    config = get_smtp_config()
    
    if not config['enabled']:
        logger.info(f"Email notifications disabled. Would send to {to_email}: {subject}")
        return False
    
    if not config['user'] or not config['password']:
        logger.warning("SMTP credentials not configured")
        return False
    
    try:
        message = MIMEMultipart('alternative')
        message['From'] = f"{config['from_name']} <{config['from_email']}>"
        message['To'] = to_email
        message['Subject'] = subject
        
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            message.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        message.attach(part2)
        
        await aiosmtplib.send(
            message,
            hostname=config['host'],
            port=config['port'],
            username=config['user'],
            password=config['password'],
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
                <p>Inicia sesión en ProManage para ver los detalles y comenzar a trabajar.</p>
                <a href="#" class="button">Ver Tarea</a>
            </div>
            <div class="footer">
                <p>Este es un correo automático de ProManage. Por favor no respondas a este mensaje.</p>
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
    
    Inicia sesión en ProManage para ver los detalles.
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
                <p>Este es un correo automático de ProManage. Por favor no respondas a este mensaje.</p>
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
                <p>Este es un correo automático de ProManage. Por favor no respondas a este mensaje.</p>
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

def get_welcome_email(user_name: str, email: str, temp_password: str, login_url: str = ""):
    """Generate HTML email for new user welcome with temporary credentials"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
            .credentials {{ background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }}
            .credentials p {{ margin: 8px 0; }}
            .credentials strong {{ color: #92400E; }}
            .warning {{ background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 ¡Bienvenido a ProManage!</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{user_name}</strong>,</p>
                <p>Se ha creado una cuenta para ti en ProManage. A continuación encontrarás tus credenciales de acceso:</p>
                
                <div class="credentials">
                    <p><strong>📧 Email:</strong> {email}</p>
                    <p><strong>🔑 Contraseña temporal:</strong> {temp_password}</p>
                </div>
                
                <div class="warning">
                    <p><strong>⚠️ Importante:</strong> Esta es una contraseña temporal. Por seguridad, se te pedirá cambiarla la primera vez que inicies sesión.</p>
                </div>
                
                <p>Inicia sesión en ProManage para comenzar a trabajar con tu equipo.</p>
            </div>
            <div class="footer">
                <p>Este es un correo automático de ProManage. Por favor no respondas a este mensaje.</p>
                <p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    ¡Bienvenido a ProManage!
    
    Hola {user_name},
    
    Se ha creado una cuenta para ti en ProManage.
    
    Tus credenciales de acceso:
    - Email: {email}
    - Contraseña temporal: {temp_password}
    
    IMPORTANTE: Esta es una contraseña temporal. Por seguridad, se te pedirá cambiarla la primera vez que inicies sesión.
    
    Inicia sesión en ProManage para comenzar.
    """
    
    return html, text
