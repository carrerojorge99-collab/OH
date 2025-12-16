from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, UploadFile, File, Query
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from uuid import uuid4
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import shutil
import mimetypes
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import requests
from enum import Enum
from email_service import send_email, get_task_assigned_email, get_task_completed_email, get_comment_email

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class UserRole(str, Enum):
    ADMIN = "admin"
    GESTOR = "gestor"
    COLABORADOR = "colaborador"
    EMPLEADO = "empleado"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"

class UserRegister(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None
    role: UserRole = UserRole.EMPLEADO

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    name: str
    email: str
    role: UserRole
    picture: Optional[str] = None
    created_at: str

class ProjectCreate(BaseModel):
    name: str
    description: str
    start_date: str
    end_date: str
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: Priority = Priority.MEDIUM
    budget_total: float = 0
    project_value: float = 0
    payment_status: PaymentStatus = PaymentStatus.PENDING
    po_summary: Optional[str] = None
    resource: Optional[str] = None
    initials: Optional[str] = None
    project_number: Optional[str] = None
    client: Optional[str] = None
    sponsor: Optional[str] = None
    po_number: Optional[str] = None
    po_quantity: Optional[float] = None
    proposal_number: Optional[str] = None
    team_members: List[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    budget_total: Optional[float] = None
    project_value: Optional[float] = None
    payment_status: Optional[PaymentStatus] = None
    po_summary: Optional[str] = None
    resource: Optional[str] = None
    initials: Optional[str] = None
    project_number: Optional[str] = None
    client: Optional[str] = None
    sponsor: Optional[str] = None
    po_number: Optional[str] = None
    po_quantity: Optional[float] = None
    proposal_number: Optional[str] = None
    team_members: Optional[List[str]] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    name: str
    description: str
    start_date: str
    end_date: str
    status: ProjectStatus
    priority: Priority
    budget_total: float
    budget_spent: float = 0
    project_value: float = 0
    profit: float = 0
    payment_status: PaymentStatus = PaymentStatus.PENDING
    po_summary: Optional[str] = None
    resource: Optional[str] = None
    initials: Optional[str] = None
    project_number: Optional[str] = None
    client: Optional[str] = None
    sponsor: Optional[str] = None
    po_number: Optional[str] = None
    po_quantity: Optional[float] = None
    proposal_number: Optional[str] = None
    cover_image: Optional[str] = None
    created_by: str
    team_members: List[str]
    created_at: str
    updated_at: str

class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str
    assigned_to: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None
    progress: int = 0

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str
    project_id: str
    title: str
    description: str
    assigned_to: Optional[str] = None
    status: TaskStatus
    priority: Priority
    due_date: Optional[str] = None
    progress: int
    created_at: str
    updated_at: str

class BudgetCategoryCreate(BaseModel):
    project_id: str
    name: str
    allocated_amount: float

class BudgetCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str
    project_id: str
    name: str
    allocated_amount: float
    spent_amount: float = 0
    created_at: str

class ExpenseCreate(BaseModel):
    project_id: str
    category_id: str
    description: str
    amount: float
    date: str

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    expense_id: str
    project_id: str
    category_id: str
    description: str
    amount: float
    date: str
    created_by: str
    created_at: str

class CommentCreate(BaseModel):
    project_id: str
    content: str

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comment_id: str
    project_id: str
    user_id: str
    user_name: str
    content: str
    timestamp: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str
    user_id: str
    type: str
    message: str
    read: bool = False
    timestamp: str

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: str
    project_id: str
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    uploaded_by: str
    uploaded_by_name: str
    uploaded_at: str

class LaborCreate(BaseModel):
    project_id: str
    labor_category: str
    hours_per_week: float
    hourly_rate: float
    estimated_total_hours: float
    consumed_hours: float = 0
    overtime_hours: float = 0
    overtime_rate: float = 0
    expenses: float = 0
    comments: Optional[str] = None

class Labor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    labor_id: str
    project_id: str
    labor_category: str
    hours_per_week: float
    hourly_rate: float
    estimated_total_hours: float
    consumed_hours: float
    consumed_cost: float
    overtime_hours: float
    overtime_rate: float
    expenses: float
    total_cost: float
    comments: Optional[str]
    created_at: str
    updated_at: str

class TimesheetCreate(BaseModel):
    project_id: str
    user_id: str
    user_name: str
    date: str
    hours_worked: float
    description: str
    task_id: Optional[str] = None

class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    timesheet_id: str
    project_id: str
    user_id: str
    user_name: str
    date: str
    hours_worked: float
    description: str
    task_id: Optional[str]
    created_at: str
    updated_at: str

class ClockEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    clock_id: str
    user_id: str
    user_name: str
    project_id: str
    project_name: str
    clock_in: str
    clock_out: Optional[str] = None
    hours_worked: Optional[float] = None
    status: str  # active, completed
    date: str
    notes: Optional[str] = None
    clock_in_latitude: Optional[float] = None
    clock_in_longitude: Optional[float] = None
    clock_in_address: Optional[str] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    clock_out_address: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    user_id: str
    user_name: str
    action: str  # create, update, delete
    entity_type: str  # project, task, expense, user, etc.
    entity_id: str
    entity_name: str
    details: Optional[dict] = None
    timestamp: str

class InvoiceItem(BaseModel):
    description: str
    hours: float
    rate: float
    amount: float

class InvoiceCreate(BaseModel):
    project_id: str
    client_name: str
    client_email: Optional[str] = None
    tax_rate: float = 0.0
    notes: Optional[str] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    invoice_number: str
    project_id: str
    project_name: str
    client_name: str
    client_email: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    amount_paid: float = 0.0
    balance_due: float = 0.0
    status: str  # draft, sent, paid, overdue, partial
    notes: Optional[str] = None
    created_by: str
    created_at: str
    due_date: Optional[str] = None
    sent_date: Optional[str] = None
    paid_date: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    payment_method: str  # cash, card, transfer, check
    reference: Optional[str] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    invoice_id: str
    amount: float
    payment_method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: str

# Estimate Models
class EstimateItem(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    amount: float

class EstimateCreate(BaseModel):
    project_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    title: str
    description: Optional[str] = None
    items: List[EstimateItem]
    tax_rate: float = 0.0
    discount_percent: float = 0.0
    notes: Optional[str] = None
    terms: Optional[str] = None
    valid_until: Optional[str] = None

class Estimate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    estimate_id: str
    estimate_number: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    title: str
    description: Optional[str] = None
    items: List[EstimateItem]
    subtotal: float
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total: float
    status: str  # draft, sent, approved, rejected, converted
    notes: Optional[str] = None
    terms: Optional[str] = None
    valid_until: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str
    sent_date: Optional[str] = None
    approved_date: Optional[str] = None
    converted_invoice_id: Optional[str] = None

async def log_audit(user_id: str, user_name: str, action: str, entity_type: str, entity_id: str, entity_name: str, details: dict = None):
    """Helper function to create audit log entries"""
    log_entry = {
        "log_id": f"log_{uuid4().hex[:16]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_entry)

class IntegrationConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    integration_id: str
    integration_type: str  # slack, google_calendar, github, gitlab
    enabled: bool
    config: dict  # Contains webhook_url, api_key, etc.
    created_at: str
    updated_at: str

async def send_slack_notification(webhook_url: str, message: str, title: str = None, color: str = "good"):
    """Send notification to Slack webhook"""
    if not webhook_url:
        return
    
    import requests
    
    payload = {
        "attachments": [{
            "color": color,
            "title": title or "Notificación de Proyectos",
            "text": message,
            "footer": "Sistema de Gestión de Proyectos",
            "ts": int(datetime.now(timezone.utc).timestamp())
        }]
    }
    
    try:
        requests.post(webhook_url, json=payload, timeout=5)
    except Exception as e:
        print(f"Error sending Slack notification: {e}")

async def notify_slack_event(event_type: str, details: dict):
    """Send notification to Slack if integration is enabled"""
    try:
        integration = await db.integrations.find_one(
            {"integration_type": "slack", "enabled": True},
            {"_id": 0}
        )
        
        if not integration:
            return
        
        webhook_url = integration.get('config', {}).get('webhook_url')
        if not webhook_url:
            return
        
        # Format message based on event type
        messages = {
            "project_created": f"🎉 Nuevo proyecto creado: **{details.get('name')}**",
            "task_completed": f"✅ Tarea completada: **{details.get('title')}** en proyecto **{details.get('project')}**",
            "invoice_paid": f"💰 Factura pagada: **{details.get('invoice_number')}** - ${details.get('amount')}",
            "project_overdue": f"⚠️ Proyecto retrasado: **{details.get('name')}** - Vencía: {details.get('due_date')}",
            "payment_received": f"💵 Pago recibido: **${details.get('amount')}** para factura **{details.get('invoice')}**"
        }
        
        message = messages.get(event_type, f"Evento: {event_type}")
        color = "good" if event_type in ["task_completed", "invoice_paid", "payment_received"] else "#764FA5"
        
        await send_slack_notification(webhook_url, message, "Notificación del Sistema", color)
    except Exception as e:
        print(f"Error in notify_slack_event: {e}")

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    token = session_token
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesión expirada")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return User(**user_doc)

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserRegister):
    # Si se proporciona email, verificar que no exista
    if user_data.email:
        existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email ya registrado")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Crear documento de usuario
    user_doc = {
        "user_id": user_id,
        "name": user_data.name,
        "email": user_data.email or "",
        "role": user_data.role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Solo hashear password si se proporciona
    if user_data.password:
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_doc["password"] = hashed_password
    else:
        user_doc["password"] = ""
    
    await db.users.insert_one(user_doc)
    user_doc_without_password = {k: v for k, v in user_doc.items() if k != 'password'}
    return User(**user_doc_without_password)

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user_doc['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    user_without_password = {k: v for k, v in user_doc.items() if k != 'password'}
    return {"user": User(**user_without_password), "token": session_token}

@api_router.post("/auth/session")
async def create_session_from_emergent(request: Request, response: Response):
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="No session ID provided")
    
    try:
        emergent_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        
        if emergent_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = emergent_response.json()
        email = data.get('email')
        name = data.get('name')
        picture = data.get('picture')
        emergent_session_token = data.get('session_token')
        
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
        
        if not user_doc:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "name": name,
                "email": email,
                "role": UserRole.COLABORADOR,
                "picture": picture,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        else:
            if user_doc.get('name') != name or user_doc.get('picture') != picture:
                await db.users.update_one(
                    {"user_id": user_doc['user_id']},
                    {"$set": {"name": name, "picture": picture}}
                )
                user_doc['name'] = name
                user_doc['picture'] = picture
        
        session_token = emergent_session_token
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "user_id": user_doc["user_id"],
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        user_without_password = {k: v for k, v in user_doc.items() if k != 'password'}
        return {"user": User(**user_without_password), "token": session_token}
    
    except Exception as e:
        logging.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al crear sesión")

@api_router.get("/auth/me", response_model=User)
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    token = session_token
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if token:
        # Delete session from database
        await db.user_sessions.delete_one({"session_token": token})
    
    # Delete cookie - must set max_age=0 to force deletion
    response.set_cookie(
        key="session_token",
        value="",
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=0  # This forces cookie deletion
    )
    
    return {"message": "Sesión cerrada exitosamente"}

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "project_id": project_id,
        "name": project_data.name,
        "description": project_data.description,
        "start_date": project_data.start_date,
        "end_date": project_data.end_date,
        "status": project_data.status,
        "priority": project_data.priority,
        "budget_total": project_data.budget_total,
        "budget_spent": 0,
        "project_value": project_data.project_value,
        "profit": project_data.project_value - 0,
        "payment_status": project_data.payment_status,
        "po_summary": project_data.po_summary,
        "resource": project_data.resource,
        "initials": project_data.initials,
        "project_number": project_data.project_number,
        "client": project_data.client,
        "sponsor": project_data.sponsor,
        "po_number": project_data.po_number,
        "po_quantity": project_data.po_quantity,
        "proposal_number": project_data.proposal_number,
        "cover_image": None,
        "created_by": user.user_id,
        "team_members": project_data.team_members,
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project_doc)
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "create",
        "project",
        project_id,
        project_data.name,
        {"budget": project_data.budget_total, "status": project_data.status}
    )
    
    # Send Slack notification
    await notify_slack_event("project_created", {
        "name": project_data.name,
        "created_by": user.name
    })
    
    return Project(**project_doc)

@api_router.get("/projects", response_model=List[Project])
async def get_projects(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    if user.role == UserRole.ADMIN:
        projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    else:
        projects = await db.projects.find(
            {"$or": [{"created_by": user.user_id}, {"team_members": user.user_id}]},
            {"_id": 0}
        ).to_list(1000)
    
    # Calcular profit para cada proyecto y asegurar payment_status
    for p in projects:
        p['project_value'] = p.get('project_value', 0)
        p['budget_spent'] = p.get('budget_spent', 0)
        p['profit'] = p['project_value'] - p['budget_spent']
        p['payment_status'] = p.get('payment_status', 'pending')
    
    return [Project(**p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id and user.user_id not in project_doc.get('team_members', []):
        raise HTTPException(status_code=403, detail="No tienes acceso a este proyecto")
    
    # Asegurar que existan los campos y calcular profit
    project_doc['project_value'] = project_doc.get('project_value', 0)
    project_doc['budget_spent'] = project_doc.get('budget_spent', 0)
    project_doc['profit'] = project_doc['project_value'] - project_doc['budget_spent']
    project_doc['payment_status'] = project_doc.get('payment_status', 'pending')
    
    return Project(**project_doc)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este proyecto")
    
    update_data = project_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalcular ganancia si se actualiza project_value
    if 'project_value' in update_data or 'budget_spent' in update_data:
        new_value = update_data.get('project_value', project_doc.get('project_value', 0))
        current_spent = project_doc.get('budget_spent', 0)
        update_data['profit'] = new_value - current_spent
    
    await db.projects.update_one({"project_id": project_id}, {"$set": update_data})
    
    updated_project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    # Recalcular profit con datos actuales
    updated_project['profit'] = updated_project.get('project_value', 0) - updated_project.get('budget_spent', 0)
    return Project(**updated_project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este proyecto")
    
    documents = await db.documents.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for doc in documents:
        file_path = UPLOAD_DIR / doc['filename']
        if file_path.exists():
            file_path.unlink()
    
    await db.projects.delete_one({"project_id": project_id})
    await db.tasks.delete_many({"project_id": project_id})
    await db.budget_categories.delete_many({"project_id": project_id})
    await db.expenses.delete_many({"project_id": project_id})
    await db.comments.delete_many({"project_id": project_id})
    await db.documents.delete_many({"project_id": project_id})
    
    return {"message": "Proyecto eliminado exitosamente"}

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": task_data.project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    task_doc = {
        "task_id": task_id,
        "project_id": task_data.project_id,
        "title": task_data.title,
        "description": task_data.description,
        "assigned_to": task_data.assigned_to,
        "status": task_data.status,
        "priority": task_data.priority,
        "due_date": task_data.due_date,
        "progress": task_data.progress,
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(task_doc)
    
    # Create notification if task is assigned
    if task_data.assigned_to:
        notification_doc = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": task_data.assigned_to,
            "type": "task_assigned",
            "message": f"{user.name} te asignó la tarea: {task_data.title}",
            "read": False,
            "timestamp": now,
            "related_id": task_id
        }
        await db.notifications.insert_one(notification_doc)
        
        # Send email notification
        assigned_user = await db.users.find_one({"user_id": task_data.assigned_to}, {"_id": 0})
        if assigned_user:
            html, text = get_task_assigned_email(
                assigned_user['name'],
                task_data.title,
                project_doc['name'],
                user.name
            )
            await send_email(
                assigned_user['email'],
                f"Nueva tarea asignada: {task_data.title}",
                html,
                text
            )
    
    return Task(**task_doc)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(project_id: Optional[str] = None, request: Request = None, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return [Task(**t) for t in tasks]

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    task_doc = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task_doc:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    update_data = task_data.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    update_data['updated_at'] = now
    
    await db.tasks.update_one({"task_id": task_id}, {"$set": update_data})
    
    # Create notification if status changed to done
    if task_data.status == TaskStatus.DONE and task_doc.get('status') != TaskStatus.DONE:
        project_doc = await db.projects.find_one({"project_id": task_doc['project_id']}, {"_id": 0})
        if project_doc and project_doc.get('created_by'):
            notification_doc = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": project_doc['created_by'],
                "type": "task_completed",
                "message": f"{user.name} completó la tarea: {task_data.title}",
                "read": False,
                "timestamp": now,
                "related_id": task_id
            }
            await db.notifications.insert_one(notification_doc)
            
            # Send email notification
            owner_user = await db.users.find_one({"user_id": project_doc['created_by']}, {"_id": 0})
            if owner_user:
                html, text = get_task_completed_email(
                    owner_user['name'],
                    task_data.title,
                    project_doc['name'],
                    user.name
                )
                await send_email(
                    owner_user['email'],
                    f"Tarea completada: {task_data.title}",
                    html,
                    text
                )
    
    # Create notification if assigned user changed
    if task_data.assigned_to and task_data.assigned_to != task_doc.get('assigned_to'):
        notification_doc = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": task_data.assigned_to,
            "type": "task_assigned",
            "message": f"{user.name} te asignó la tarea: {task_data.title}",
            "read": False,
            "timestamp": now,
            "related_id": task_id
        }
        await db.notifications.insert_one(notification_doc)
    
    updated_task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    await db.tasks.delete_one({"task_id": task_id})
    return {"message": "Tarea eliminada exitosamente"}

@api_router.post("/budget/categories", response_model=BudgetCategory)
async def create_budget_category(category_data: BudgetCategoryCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    category_id = f"cat_{uuid.uuid4().hex[:12]}"
    
    category_doc = {
        "category_id": category_id,
        "project_id": category_data.project_id,
        "name": category_data.name,
        "allocated_amount": category_data.allocated_amount,
        "spent_amount": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.budget_categories.insert_one(category_doc)
    return BudgetCategory(**category_doc)

@api_router.get("/budget/categories", response_model=List[BudgetCategory])
async def get_budget_categories(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    categories = await db.budget_categories.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return [BudgetCategory(**c) for c in categories]

@api_router.put("/budget/categories/{category_id}", response_model=BudgetCategory)
async def update_budget_category(category_id: str, category_data: BudgetCategoryCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    category = await db.budget_categories.find_one({"category_id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    update_data = {
        "name": category_data.name,
        "allocated_amount": category_data.allocated_amount
    }
    
    await db.budget_categories.update_one({"category_id": category_id}, {"$set": update_data})
    
    updated_category = await db.budget_categories.find_one({"category_id": category_id}, {"_id": 0})
    return BudgetCategory(**updated_category)

@api_router.delete("/budget/categories/{category_id}")
async def delete_budget_category(category_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    category = await db.budget_categories.find_one({"category_id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    # Check if category has expenses
    expenses = await db.expenses.find({"category_id": category_id}, {"_id": 0}).to_list(1)
    if expenses:
        raise HTTPException(status_code=400, detail="No se puede eliminar una categoría con gastos registrados")
    
    await db.budget_categories.delete_one({"category_id": category_id})
    return {"message": "Categoría eliminada exitosamente"}

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    expense_id = f"exp_{uuid.uuid4().hex[:12]}"
    
    expense_doc = {
        "expense_id": expense_id,
        "project_id": expense_data.project_id,
        "category_id": expense_data.category_id,
        "description": expense_data.description,
        "amount": expense_data.amount,
        "date": expense_data.date,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.expenses.insert_one(expense_doc)
    
    await db.budget_categories.update_one(
        {"category_id": expense_data.category_id},
        {"$inc": {"spent_amount": expense_data.amount}}
    )
    
    # Actualizar budget_spent y recalcular profit
    project = await db.projects.find_one({"project_id": expense_data.project_id}, {"_id": 0})
    new_spent = project.get('budget_spent', 0) + expense_data.amount
    project_value = project.get('project_value', 0)
    new_profit = project_value - new_spent
    
    await db.projects.update_one(
        {"project_id": expense_data.project_id},
        {"$set": {"budget_spent": new_spent, "profit": new_profit}}
    )
    
    return Expense(**expense_doc)

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    expenses = await db.expenses.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return [Expense(**e) for e in expenses]

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    expense = await db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Revertir el gasto anterior
    old_amount = expense['amount']
    old_category_id = expense['category_id']
    
    await db.budget_categories.update_one(
        {"category_id": old_category_id},
        {"$inc": {"spent_amount": -old_amount}}
    )
    
    project = await db.projects.find_one({"project_id": expense['project_id']}, {"_id": 0})
    old_spent = project.get('budget_spent', 0) - old_amount
    old_profit = project.get('project_value', 0) - old_spent
    
    await db.projects.update_one(
        {"project_id": expense['project_id']},
        {"$set": {"budget_spent": old_spent, "profit": old_profit}}
    )
    
    # Aplicar el nuevo gasto
    update_data = {
        "category_id": expense_data.category_id,
        "description": expense_data.description,
        "amount": expense_data.amount,
        "date": expense_data.date
    }
    
    await db.expenses.update_one({"expense_id": expense_id}, {"$set": update_data})
    
    await db.budget_categories.update_one(
        {"category_id": expense_data.category_id},
        {"$inc": {"spent_amount": expense_data.amount}}
    )
    
    new_spent = old_spent + expense_data.amount
    new_profit = project.get('project_value', 0) - new_spent
    
    await db.projects.update_one(
        {"project_id": expense['project_id']},
        {"$set": {"budget_spent": new_spent, "profit": new_profit}}
    )
    
    updated_expense = await db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})
    return Expense(**updated_expense)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    expense = await db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Revertir el gasto de la categoría
    await db.budget_categories.update_one(
        {"category_id": expense['category_id']},
        {"$inc": {"spent_amount": -expense['amount']}}
    )
    
    # Revertir el gasto del proyecto
    project = await db.projects.find_one({"project_id": expense['project_id']}, {"_id": 0})
    new_spent = project.get('budget_spent', 0) - expense['amount']
    new_profit = project.get('project_value', 0) - new_spent
    
    await db.projects.update_one(
        {"project_id": expense['project_id']},
        {"$set": {"budget_spent": new_spent, "profit": new_profit}}
    )
    
    await db.expenses.delete_one({"expense_id": expense_id})
    return {"message": "Gasto eliminado exitosamente"}

@api_router.post("/labor", response_model=Labor)
async def create_labor(labor_data: LaborCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    labor_id = f"labor_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Calcular total_cost (costo estimado)
    regular_cost = labor_data.estimated_total_hours * labor_data.hourly_rate
    overtime_cost = labor_data.overtime_hours * labor_data.overtime_rate
    total_cost = regular_cost + overtime_cost + labor_data.expenses
    
    # Calcular consumed_cost (costo real basado en horas consumidas)
    consumed_cost = labor_data.consumed_hours * labor_data.hourly_rate
    
    labor_doc = {
        "labor_id": labor_id,
        "project_id": labor_data.project_id,
        "labor_category": labor_data.labor_category,
        "hours_per_week": labor_data.hours_per_week,
        "hourly_rate": labor_data.hourly_rate,
        "estimated_total_hours": labor_data.estimated_total_hours,
        "consumed_hours": labor_data.consumed_hours,
        "consumed_cost": consumed_cost,
        "overtime_hours": labor_data.overtime_hours,
        "overtime_rate": labor_data.overtime_rate,
        "expenses": labor_data.expenses,
        "total_cost": total_cost,
        "comments": labor_data.comments,
        "created_at": now,
        "updated_at": now
    }
    
    await db.labor.insert_one(labor_doc)
    return Labor(**labor_doc)

@api_router.get("/labor", response_model=List[Labor])
async def get_labor(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    labor_records = await db.labor.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    # Asegurar que los registros antiguos tengan los nuevos campos
    for record in labor_records:
        if 'consumed_hours' not in record:
            record['consumed_hours'] = 0
        if 'consumed_cost' not in record:
            record['consumed_cost'] = 0
    
    return [Labor(**l) for l in labor_records]

@api_router.put("/labor/{labor_id}", response_model=Labor)
async def update_labor(labor_id: str, labor_data: LaborCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    labor = await db.labor.find_one({"labor_id": labor_id}, {"_id": 0})
    if not labor:
        raise HTTPException(status_code=404, detail="Registro de labor no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Calcular total_cost (costo estimado)
    regular_cost = labor_data.estimated_total_hours * labor_data.hourly_rate
    overtime_cost = labor_data.overtime_hours * labor_data.overtime_rate
    total_cost = regular_cost + overtime_cost + labor_data.expenses
    
    # Calcular consumed_cost (costo real basado en horas consumidas)
    consumed_cost = labor_data.consumed_hours * labor_data.hourly_rate
    
    update_data = {
        "labor_category": labor_data.labor_category,
        "hours_per_week": labor_data.hours_per_week,
        "hourly_rate": labor_data.hourly_rate,
        "estimated_total_hours": labor_data.estimated_total_hours,
        "consumed_hours": labor_data.consumed_hours,
        "consumed_cost": consumed_cost,
        "overtime_hours": labor_data.overtime_hours,
        "overtime_rate": labor_data.overtime_rate,
        "expenses": labor_data.expenses,
        "total_cost": total_cost,
        "comments": labor_data.comments,
        "updated_at": now
    }
    
    await db.labor.update_one({"labor_id": labor_id}, {"$set": update_data})
    
    updated_labor = await db.labor.find_one({"labor_id": labor_id}, {"_id": 0})
    return Labor(**updated_labor)

@api_router.delete("/labor/{labor_id}")
async def delete_labor(labor_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    labor = await db.labor.find_one({"labor_id": labor_id}, {"_id": 0})
    if not labor:
        raise HTTPException(status_code=404, detail="Registro de labor no encontrado")
    
    await db.labor.delete_one({"labor_id": labor_id})
    return {"message": "Registro de labor eliminado exitosamente"}

@api_router.post("/timesheet", response_model=Timesheet)
async def create_timesheet(timesheet_data: TimesheetCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    timesheet_id = f"timesheet_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    timesheet_doc = {
        "timesheet_id": timesheet_id,
        "project_id": timesheet_data.project_id,
        "user_id": timesheet_data.user_id,
        "user_name": timesheet_data.user_name,
        "date": timesheet_data.date,
        "hours_worked": timesheet_data.hours_worked,
        "description": timesheet_data.description,
        "task_id": timesheet_data.task_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.timesheet.insert_one(timesheet_doc)
    return Timesheet(**timesheet_doc)

@api_router.get("/timesheet", response_model=List[Timesheet])
async def get_timesheets(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    timesheets = await db.timesheet.find({"project_id": project_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    return [Timesheet(**t) for t in timesheets]

@api_router.put("/timesheet/{timesheet_id}", response_model=Timesheet)
async def update_timesheet(timesheet_id: str, timesheet_data: TimesheetCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    timesheet = await db.timesheet.find_one({"timesheet_id": timesheet_id}, {"_id": 0})
    if not timesheet:
        raise HTTPException(status_code=404, detail="Registro de timesheet no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "user_id": timesheet_data.user_id,
        "user_name": timesheet_data.user_name,
        "date": timesheet_data.date,
        "hours_worked": timesheet_data.hours_worked,
        "description": timesheet_data.description,
        "task_id": timesheet_data.task_id,
        "updated_at": now
    }
    
    await db.timesheet.update_one({"timesheet_id": timesheet_id}, {"$set": update_data})
    
    updated_timesheet = await db.timesheet.find_one({"timesheet_id": timesheet_id}, {"_id": 0})
    return Timesheet(**updated_timesheet)

@api_router.delete("/timesheet/{timesheet_id}")
async def delete_timesheet(timesheet_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    timesheet = await db.timesheet.find_one({"timesheet_id": timesheet_id}, {"_id": 0})
    if not timesheet:
        raise HTTPException(status_code=404, detail="Registro de timesheet no encontrado")
    
    await db.timesheet.delete_one({"timesheet_id": timesheet_id})
    return {"message": "Registro de timesheet eliminado exitosamente"}

@api_router.post("/clock/in", response_model=ClockEntry)
async def clock_in(
    project_id: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    address: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Validate location data (mandatory)
    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400, 
            detail="La ubicación GPS es obligatoria para ponchar. Por favor, permite el acceso a tu ubicación."
        )
    
    # Check if user is already clocked in
    active_clock = await db.clock_entries.find_one({
        "user_id": user.user_id,
        "status": "active"
    }, {"_id": 0})
    
    if active_clock:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya tienes un ponche activo en el proyecto {active_clock.get('project_name')}. Debes ponchar salida primero."
        )
    
    # Get project info
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Check if user is assigned to project
    if user.user_id not in project.get('team_members', []) and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No estás asignado a este proyecto")
    
    # Create clock entry
    clock_id = f"clk_{uuid4().hex[:16]}"
    now = datetime.now(timezone.utc)
    
    clock_doc = {
        "clock_id": clock_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "project_id": project_id,
        "project_name": project.get('name'),
        "clock_in": now.isoformat(),
        "clock_out": None,
        "hours_worked": None,
        "status": "active",
        "date": now.date().isoformat(),
        "notes": notes,
        "clock_in_latitude": latitude,
        "clock_in_longitude": longitude,
        "clock_in_address": address
    }
    
    await db.clock_entries.insert_one(clock_doc)
    
    # Send Slack notification
    await notify_slack_event("clock_in", {
        "user": user.name,
        "project": project.get('name'),
        "time": now.strftime("%H:%M")
    })
    
    return ClockEntry(**clock_doc)

@api_router.post("/clock/out", response_model=ClockEntry)
async def clock_out(
    latitude: float = Query(...),
    longitude: float = Query(...),
    address: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Validate location data (mandatory)
    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400, 
            detail="La ubicación GPS es obligatoria para ponchar. Por favor, permite el acceso a tu ubicación."
        )
    
    # Find active clock entry
    active_clock = await db.clock_entries.find_one({
        "user_id": user.user_id,
        "status": "active"
    }, {"_id": 0})
    
    if not active_clock:
        raise HTTPException(status_code=400, detail="No tienes un ponche activo")
    
    # Calculate hours worked
    clock_in_time = datetime.fromisoformat(active_clock['clock_in'])
    clock_out_time = datetime.now(timezone.utc)
    hours_worked = (clock_out_time - clock_in_time).total_seconds() / 3600
    
    # Update clock entry
    await db.clock_entries.update_one(
        {"clock_id": active_clock['clock_id']},
        {"$set": {
            "clock_out": clock_out_time.isoformat(),
            "hours_worked": round(hours_worked, 2),
            "status": "completed",
            "notes": notes or active_clock.get('notes'),
            "clock_out_latitude": latitude,
            "clock_out_longitude": longitude,
            "clock_out_address": address
        }}
    )
    
    # Create timesheet entry automatically
    timesheet_id = f"ts_{uuid4().hex[:16]}"
    timesheet_doc = {
        "timesheet_id": timesheet_id,
        "project_id": active_clock['project_id'],
        "project_name": active_clock.get('project_name', ''),
        "user_id": user.user_id,
        "user_name": user.name,
        "date": active_clock['date'],
        "hours_worked": round(hours_worked, 2),
        "description": notes or f"Trabajo registrado mediante ponche ({clock_in_time.strftime('%H:%M')} - {clock_out_time.strftime('%H:%M')})",
        "task_id": None,
        "clock_id": active_clock['clock_id'],
        "created_at": clock_out_time.isoformat(),
        "updated_at": clock_out_time.isoformat()
    }
    
    await db.timesheet.insert_one(timesheet_doc)
    print(f"✅ Timesheet creado automáticamente: {timesheet_id} para proyecto {active_clock['project_id']}")
    
    # Get updated clock entry
    updated_clock = await db.clock_entries.find_one({"clock_id": active_clock['clock_id']}, {"_id": 0})
    
    return ClockEntry(**updated_clock)

@api_router.get("/clock/active", response_model=Optional[ClockEntry])
async def get_active_clock(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    active_clock = await db.clock_entries.find_one({
        "user_id": user.user_id,
        "status": "active"
    }, {"_id": 0})
    
    if not active_clock:
        return None
    
    return ClockEntry(**active_clock)

@api_router.get("/clock/history", response_model=List[ClockEntry])
async def get_clock_history(
    date: Optional[str] = None,
    limit: int = 50,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    
    clock_entries = await db.clock_entries.find(
        query, 
        {"_id": 0}
    ).sort("clock_in", -1).limit(limit).to_list(limit)
    
    return [ClockEntry(**entry) for entry in clock_entries]

@api_router.get("/clock/all", response_model=List[ClockEntry])
async def get_all_clock_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    """Get all clock entries (admin only)"""
    user = await get_current_user(request, session_token)
    
    # Only admin can see all entries
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver todos los ponches")
    
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    
    if project_id:
        query["project_id"] = project_id
    
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    
    clock_entries = await db.clock_entries.find(
        query, 
        {"_id": 0}
    ).sort("clock_in", -1).to_list(1000)
    
    return [ClockEntry(**entry) for entry in clock_entries]

@api_router.get("/clock/projects", response_model=List[dict])
async def get_assigned_projects(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get projects where user is assigned (for clock-in)"""
    user = await get_current_user(request, session_token)
    
    # Admins can see all active projects
    if user.role == UserRole.ADMIN:
        projects = await db.projects.find(
            {"status": {"$ne": "completed"}},
            {"_id": 0, "project_id": 1, "name": 1, "status": 1}
        ).to_list(1000)
    else:
        # Regular users see only assigned projects
        projects = await db.projects.find(
            {
                "team_members": user.user_id,
                "status": {"$ne": "completed"}
            },
            {"_id": 0, "project_id": 1, "name": 1, "status": 1}
        ).to_list(1000)
    
    return projects

@api_router.delete("/clock/{clock_id}")
async def delete_clock_entry(
    clock_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Delete a clock entry (admin only)"""
    user = await get_current_user(request, session_token)
    
    # Only admins can delete clock entries
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo los administradores pueden eliminar ponches")
    
    # Find the clock entry
    clock_entry = await db.clock_entries.find_one({"clock_id": clock_id}, {"_id": 0})
    if not clock_entry:
        raise HTTPException(status_code=404, detail="Ponche no encontrado")
    
    # Delete the clock entry
    await db.clock_entries.delete_one({"clock_id": clock_id})
    
    # Also delete associated timesheet if exists
    # Try by clock_id first, then by user/date/project match
    deleted_ts = await db.timesheet.delete_one({"clock_id": clock_id})
    if deleted_ts.deleted_count == 0:
        # Try matching by user, date, project and approximate time
        clock_in_time = clock_entry.get('clock_in', '')
        if clock_in_time:
            await db.timesheet.delete_one({
                "user_id": clock_entry.get('user_id'),
                "date": clock_entry.get('date'),
                "project_id": clock_entry.get('project_id'),
                "description": {"$regex": "ponche", "$options": "i"}
            })
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "delete",
        "clock_entry",
        clock_id,
        f"Ponche de {clock_entry.get('user_name', 'Unknown')}",
        {"date": clock_entry.get('date'), "project": clock_entry.get('project_name')}
    )
    
    return {"message": "Ponche eliminado exitosamente"}

@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    comment_id = f"comm_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    comment_doc = {
        "comment_id": comment_id,
        "project_id": comment_data.project_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "content": comment_data.content,
        "timestamp": now
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Notify project owner and team members
    project_doc = await db.projects.find_one({"project_id": comment_data.project_id}, {"_id": 0})
    if project_doc:
        notify_users = [project_doc.get('created_by')] + project_doc.get('team_members', [])
        notify_users = [u for u in notify_users if u != user.user_id]  # Don't notify self
        
        for notify_user in notify_users:
            notification_doc = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": notify_user,
                "type": "new_comment",
                "message": f"{user.name} comentó en {project_doc['name']}",
                "read": False,
                "timestamp": now,
                "related_id": comment_data.project_id
            }
            await db.notifications.insert_one(notification_doc)
    
    return Comment(**comment_doc)

@api_router.get("/comments", response_model=List[Comment])
async def get_comments(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    comments = await db.comments.find({"project_id": project_id}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return [Comment(**c) for c in comments]

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    notifications = await db.notifications.find({"user_id": user.user_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return [Notification(**n) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notificación marcada como leída"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    result = await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": f"{result.modified_count} notificaciones marcadas como leídas"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    if user.role == UserRole.ADMIN:
        projects_query = {}
    else:
        projects_query = {"$or": [{"created_by": user.user_id}, {"team_members": user.user_id}]}
    
    total_projects = await db.projects.count_documents(projects_query)
    active_projects = await db.projects.count_documents({**projects_query, "status": ProjectStatus.IN_PROGRESS})
    completed_projects = await db.projects.count_documents({**projects_query, "status": ProjectStatus.COMPLETED})
    
    projects = await db.projects.find(projects_query, {"_id": 0}).to_list(1000)
    total_budget = sum(p.get('budget_total', 0) for p in projects)
    total_spent = sum(p.get('budget_spent', 0) for p in projects)
    total_value = sum(p.get('project_value', 0) for p in projects)
    total_profit = total_value - total_spent
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "budget_remaining": total_budget - total_spent,
        "total_value": total_value,
        "total_profit": total_profit
    }

@api_router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get('status') == TaskStatus.DONE])
    in_progress_tasks = len([t for t in tasks if t.get('status') == TaskStatus.IN_PROGRESS])
    
    categories = await db.budget_categories.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    project_value = project_doc.get('project_value', 0)
    budget_spent = project_doc.get('budget_spent', 0)
    profit = project_value - budget_spent
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "budget_total": project_doc.get('budget_total', 0),
        "budget_spent": budget_spent,
        "budget_remaining": project_doc.get('budget_total', 0) - budget_spent,
        "project_value": project_value,
        "profit": profit,
        "categories": categories,
        "recent_expenses": expenses[-10:] if expenses else []
    }

@api_router.get("/reports/project/{project_id}/export")
async def export_project_report(project_id: str, format: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    categories = await db.budget_categories.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    if format == "excel":
        wb = Workbook()
        ws = wb.active
        ws.title = "Resumen del Proyecto"
        
        title_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
        title_font = Font(bold=True, color="FFFFFF", size=14)
        header_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
        header_font = Font(bold=True)
        
        ws['A1'] = f"Reporte del Proyecto: {project_doc['name']}"
        ws['A1'].fill = title_fill
        ws['A1'].font = title_font
        ws.merge_cells('A1:E1')
        
        ws['A3'] = "Información del Proyecto"
        ws['A3'].font = header_font
        ws['A4'] = "Descripción:"
        ws['B4'] = project_doc['description']
        ws['A5'] = "Estado:"
        ws['B5'] = project_doc['status']
        ws['A6'] = "Presupuesto Total:"
        ws['B6'] = f"${project_doc['budget_total']:,.2f}"
        ws['A7'] = "Presupuesto Gastado:"
        ws['B7'] = f"${project_doc.get('budget_spent', 0):,.2f}"
        
        ws['A9'] = "Tareas"
        ws['A9'].font = header_font
        ws['A10'] = "Título"
        ws['B10'] = "Estado"
        ws['C10'] = "Prioridad"
        ws['D10'] = "Progreso"
        for col in ['A10', 'B10', 'C10', 'D10']:
            ws[col].fill = header_fill
            ws[col].font = header_font
        
        row = 11
        for task in tasks:
            ws[f'A{row}'] = task['title']
            ws[f'B{row}'] = task['status']
            ws[f'C{row}'] = task['priority']
            ws[f'D{row}'] = f"{task['progress']}%"
            row += 1
        
        ws[f'A{row+1}'] = "Gastos"
        ws[f'A{row+1}'].font = header_font
        ws[f'A{row+2}'] = "Descripción"
        ws[f'B{row+2}'] = "Monto"
        ws[f'C{row+2}'] = "Fecha"
        for col in [f'A{row+2}', f'B{row+2}', f'C{row+2}']:
            ws[col].fill = header_fill
            ws[col].font = header_font
        
        exp_row = row + 3
        for expense in expenses:
            ws[f'A{exp_row}'] = expense['description']
            ws[f'B{exp_row}'] = f"${expense['amount']:,.2f}"
            ws[f'C{exp_row}'] = expense['date']
            exp_row += 1
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=proyecto_{project_id}.xlsx"}
        )
    
    elif format == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#2563EB'),
            spaceAfter=12
        )
        
        elements.append(Paragraph(f"Reporte del Proyecto: {project_doc['name']}", title_style))
        elements.append(Spacer(1, 0.2*inch))
        
        info_data = [
            ['Descripción:', project_doc['description']],
            ['Estado:', project_doc['status']],
            ['Presupuesto Total:', f"${project_doc['budget_total']:,.2f}"],
            ['Presupuesto Gastado:', f"${project_doc.get('budget_spent', 0):,.2f}"]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E2E8F0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))
        
        elements.append(Paragraph("Tareas", styles['Heading2']))
        if tasks:
            task_data = [['Título', 'Estado', 'Prioridad', 'Progreso']]
            for task in tasks:
                task_data.append([
                    task['title'][:30],
                    task['status'],
                    task['priority'],
                    f"{task['progress']}%"
                ])
            
            task_table = Table(task_data, colWidths=[2.5*inch, 1.2*inch, 1*inch, 0.8*inch])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey)
            ]))
            elements.append(task_table)
        
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Gastos", styles['Heading2']))
        if expenses:
            expense_data = [['Descripción', 'Monto', 'Fecha']]
            for expense in expenses:
                expense_data.append([
                    expense['description'][:40],
                    f"${expense['amount']:,.2f}",
                    expense['date']
                ])
            
            expense_table = Table(expense_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            expense_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey)
            ]))
            elements.append(expense_table)
        
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=proyecto_{project_id}.pdf"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado")

@api_router.get("/users", response_model=List[User])
async def get_users(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Convert datetime to string
    for u in users:
        if 'created_at' in u and not isinstance(u['created_at'], str):
            u['created_at'] = u['created_at'].isoformat() if hasattr(u['created_at'], 'isoformat') else str(u['created_at'])
    
    return [User(**u) for u in users]

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    current_user = await get_current_user(request, session_token)
    
    # Only admins can delete users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")
    
    # Cannot delete yourself
    if current_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    user_to_delete = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Delete user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Delete user notifications
    await db.notifications.delete_many({"user_id": user_id})
    
    # Unassign user from all tasks
    await db.tasks.update_many(
        {"assigned_to": user_id},
        {"$set": {"assigned_to": None}}
    )
    
    # Remove user from project teams
    await db.projects.update_many(
        {"team_members": user_id},
        {"$pull": {"team_members": user_id}}
    )
    
    # Delete the user
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": f"Usuario {user_to_delete['name']} eliminado exitosamente"}

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    current_user = await get_current_user(request, session_token)
    
    # Only admins can update users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar usuarios")
    
    user_to_update = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = {}
    
    if user_data.name is not None:
        update_data["name"] = user_data.name
    
    if user_data.email is not None:
        # Verificar que el email no esté en uso por otro usuario
        if user_data.email:
            existing = await db.users.find_one({"email": user_data.email, "user_id": {"$ne": user_id}}, {"_id": 0})
            if existing:
                raise HTTPException(status_code=400, detail="Email ya está en uso por otro usuario")
        update_data["email"] = user_data.email
    
    if user_data.password is not None:
        if user_data.password:
            hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            update_data["password"] = hashed_password
    
    if user_data.role is not None:
        update_data["role"] = user_data.role
    
    if update_data:
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_without_password = {k: v for k, v in updated_user.items() if k != 'password'}
    return User(**user_without_password)

@api_router.get("/settings")
async def get_settings(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    # Only admins can view settings
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver la configuración")
    
    return {
        "smtp_host": os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
        "smtp_port": int(os.environ.get('SMTP_PORT', 587)),
        "smtp_user": os.environ.get('SMTP_USER', ''),
        "smtp_from_email": os.environ.get('SMTP_FROM_EMAIL', 'noreply@proyecthub.com'),
        "smtp_from_name": os.environ.get('SMTP_FROM_NAME', 'ProyectHub'),
        "email_notifications_enabled": os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'false').lower() == 'true'
    }

@api_router.put("/settings")
async def update_settings(settings: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    # Only admins can update settings
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar la configuración")
    
    # Update .env file
    env_path = Path("/app/backend/.env")
    env_content = env_path.read_text()
    
    if 'smtp_user' in settings:
        env_content = update_env_var(env_content, 'SMTP_USER', settings['smtp_user'])
    if 'smtp_password' in settings:
        env_content = update_env_var(env_content, 'SMTP_PASSWORD', settings['smtp_password'])
    if 'email_notifications_enabled' in settings:
        env_content = update_env_var(env_content, 'EMAIL_NOTIFICATIONS_ENABLED', str(settings['email_notifications_enabled']).lower())
    
    env_path.write_text(env_content)
    
    # Reload environment variables
    from dotenv import load_dotenv
    load_dotenv(env_path, override=True)
    
    return {"message": "Configuración actualizada exitosamente. Reinicia el backend para aplicar cambios."}

def update_env_var(content: str, key: str, value: str) -> str:
    """Update or add an environment variable in .env content"""
    lines = content.split('\n')
    updated = False
    
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f'{key}="{value}"'
            updated = True
            break
    
    if not updated:
        lines.append(f'{key}="{value}"')
    
    return '\n'.join(lines)

UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@api_router.post("/documents/upload", response_model=Document)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id and user.user_id not in project_doc.get('team_members', []):
        raise HTTPException(status_code=403, detail="No tienes acceso a este proyecto")
    
    max_size = 10 * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máximo 10MB)")
    
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    file_extension = Path(file.filename).suffix
    filename = f"{document_id}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    mime_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    
    document_doc = {
        "document_id": document_id,
        "project_id": project_id,
        "filename": filename,
        "original_filename": file.filename,
        "file_size": len(file_content),
        "file_type": mime_type,
        "uploaded_by": user.user_id,
        "uploaded_by_name": user.name,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(document_doc)
    return Document(**document_doc)

@api_router.get("/documents", response_model=List[Document])
async def get_documents(project_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    project_doc = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id and user.user_id not in project_doc.get('team_members', []):
        raise HTTPException(status_code=403, detail="No tienes acceso a este proyecto")
    
    documents = await db.documents.find({"project_id": project_id}, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)
    return [Document(**d) for d in documents]

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    document_doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    if not document_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    project_doc = await db.projects.find_one({"project_id": document_doc['project_id']}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id and user.user_id not in project_doc.get('team_members', []):
        raise HTTPException(status_code=403, detail="No tienes acceso a este documento")
    
    file_path = UPLOAD_DIR / document_doc['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
    
    return FileResponse(
        path=file_path,
        filename=document_doc['original_filename'],
        media_type=document_doc['file_type']
    )

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    
    document_doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    if not document_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    project_doc = await db.projects.find_one({"project_id": document_doc['project_id']}, {"_id": 0})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if user.role != UserRole.ADMIN and project_doc['created_by'] != user.user_id and document_doc['uploaded_by'] != user.user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este documento")
    
    file_path = UPLOAD_DIR / document_doc['filename']
    if file_path.exists():
        file_path.unlink()
    
    await db.documents.delete_one({"document_id": document_id})
    return {"message": "Documento eliminado exitosamente"}

@api_router.post("/invoices/generate", response_model=Invoice)
async def generate_invoice_from_timesheet(
    invoice_data: InvoiceCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Get project
    project = await db.projects.find_one({"project_id": invoice_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Get timesheet entries for this project
    timesheet_entries = await db.timesheet.find(
        {"project_id": invoice_data.project_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Get labor/salary data to get rates
    labor_entries = await db.labor.find(
        {"project_id": invoice_data.project_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Create invoice items from timesheet
    items = []
    total_hours = 0
    
    # Group timesheet by user
    user_hours = {}
    for entry in timesheet_entries:
        user_name = entry.get('user_name', 'Unknown')
        hours = entry.get('hours_worked', 0)
        if user_name not in user_hours:
            user_hours[user_name] = 0
        user_hours[user_name] += hours
        total_hours += hours
    
    # Default rate if no labor data
    default_rate = 50.0
    
    # Create items
    for user_name, hours in user_hours.items():
        # Try to find rate from labor data
        rate = default_rate
        for labor in labor_entries:
            if labor.get('labor_category') == user_name:
                rate = labor.get('hourly_rate', default_rate)
                break
        
        items.append(InvoiceItem(
            description=f"Horas trabajadas - {user_name}",
            hours=round(hours, 2),
            rate=rate,
            amount=round(hours * rate, 2)
        ))
    
    # Calculate totals
    subtotal = sum(item.amount for item in items)
    tax_amount = round(subtotal * (invoice_data.tax_rate / 100), 2)
    total = subtotal + tax_amount
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.now().year}-{str(invoice_count + 1).zfill(4)}"
    
    # Create invoice
    invoice_id = f"inv_{uuid4().hex[:16]}"
    due_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    invoice_doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "project_id": invoice_data.project_id,
        "project_name": project.get('name', ''),
        "client_name": invoice_data.client_name,
        "client_email": invoice_data.client_email,
        "items": [item.model_dump() for item in items],
        "subtotal": subtotal,
        "tax_rate": invoice_data.tax_rate,
        "tax_amount": tax_amount,
        "total": total,
        "amount_paid": 0.0,
        "balance_due": total,
        "status": "draft",
        "notes": invoice_data.notes,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": due_date,
        "sent_date": None,
        "paid_date": None
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "create",
        "invoice",
        invoice_id,
        invoice_number,
        {"project": project.get('name'), "total": total}
    )
    
    return Invoice(**invoice_doc)

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    project_id: Optional[str] = None,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Invoice(**inv) for inv in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(
    invoice_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    return Invoice(**invoice)

@api_router.put("/invoices/{invoice_id}/status", response_model=Invoice)
async def update_invoice_status(
    invoice_id: str,
    status: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    if status not in ["draft", "sent", "paid"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": status}}
    )
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "update",
        "invoice",
        invoice_id,
        invoice.get('invoice_number', ''),
        {"status": status}
    )
    
    return Invoice(**invoice)

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    await db.invoices.delete_one({"invoice_id": invoice_id})
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "delete",
        "invoice",
        invoice_id,
        invoice.get('invoice_number', ''),
        {}
    )
    
    return {"message": "Factura eliminada exitosamente"}

@api_router.post("/invoices/{invoice_id}/payments", response_model=Payment)
async def add_payment_to_invoice(
    invoice_id: str,
    payment_data: PaymentCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Get invoice
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Calculate new amounts
    current_paid = invoice.get('amount_paid', 0)
    new_paid = current_paid + payment_data.amount
    balance = invoice['total'] - new_paid
    
    # Determine new status
    if balance <= 0:
        new_status = 'paid'
        paid_date = datetime.now(timezone.utc).isoformat()
    elif new_paid > 0:
        new_status = 'partial'
        paid_date = None
    else:
        new_status = invoice['status']
        paid_date = None
    
    # Create payment record
    payment_id = f"pay_{uuid4().hex[:16]}"
    payment_doc = {
        "payment_id": payment_id,
        "invoice_id": invoice_id,
        "amount": payment_data.amount,
        "payment_method": payment_data.payment_method,
        "reference": payment_data.reference,
        "notes": payment_data.notes,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    
    # Update invoice
    update_data = {
        "amount_paid": new_paid,
        "balance_due": balance,
        "status": new_status
    }
    if paid_date:
        update_data["paid_date"] = paid_date
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": update_data}
    )
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "create",
        "payment",
        payment_id,
        f"Pago de ${payment_data.amount} para {invoice.get('invoice_number')}",
        {"invoice": invoice.get('invoice_number'), "amount": payment_data.amount}
    )
    
    # Send Slack notification
    event_type = "invoice_paid" if new_status == 'paid' else "payment_received"
    await notify_slack_event(event_type, {
        "invoice": invoice.get('invoice_number'),
        "amount": payment_data.amount
    })
    
    return Payment(**payment_doc)

@api_router.get("/invoices/{invoice_id}/payments", response_model=List[Payment])
async def get_invoice_payments(
    invoice_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(1000)
    return [Payment(**p) for p in payments]

@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice_email(
    invoice_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    if not invoice.get('client_email'):
        raise HTTPException(status_code=400, detail="La factura no tiene email del cliente")
    
    # Update status and sent date
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {
            "status": "sent",
            "sent_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # TODO: Implement actual email sending using SMTP settings
    # For now, just mark as sent
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "update",
        "invoice",
        invoice_id,
        invoice.get('invoice_number', ''),
        {"action": "sent_email", "to": invoice.get('client_email')}
    )
    
    return {"message": f"Factura enviada a {invoice.get('client_email')}", "status": "sent"}

# ============== ESTIMATES ENDPOINTS ==============

@api_router.post("/estimates", response_model=Estimate)
async def create_estimate(
    estimate_data: EstimateCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Generate estimate number
    count = await db.estimates.count_documents({})
    estimate_number = f"EST-{datetime.now().year}-{str(count + 1).zfill(4)}"
    estimate_id = f"est_{uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Get project name if project_id provided
    project_name = None
    if estimate_data.project_id:
        project = await db.projects.find_one({"project_id": estimate_data.project_id}, {"_id": 0, "name": 1})
        if project:
            project_name = project.get('name')
    
    # Calculate totals
    subtotal = sum(item.amount for item in estimate_data.items)
    discount_amount = subtotal * (estimate_data.discount_percent / 100)
    taxable_amount = subtotal - discount_amount
    tax_amount = taxable_amount * (estimate_data.tax_rate / 100)
    total = taxable_amount + tax_amount
    
    estimate_doc = {
        "estimate_id": estimate_id,
        "estimate_number": estimate_number,
        "project_id": estimate_data.project_id,
        "project_name": project_name,
        "client_name": estimate_data.client_name,
        "client_email": estimate_data.client_email,
        "client_phone": estimate_data.client_phone,
        "client_address": estimate_data.client_address,
        "title": estimate_data.title,
        "description": estimate_data.description,
        "items": [item.model_dump() for item in estimate_data.items],
        "subtotal": round(subtotal, 2),
        "discount_percent": estimate_data.discount_percent,
        "discount_amount": round(discount_amount, 2),
        "tax_rate": estimate_data.tax_rate,
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
        "status": "draft",
        "notes": estimate_data.notes,
        "terms": estimate_data.terms,
        "valid_until": estimate_data.valid_until,
        "created_by": user.user_id,
        "created_by_name": user.name,
        "created_at": now,
        "sent_date": None,
        "approved_date": None,
        "converted_invoice_id": None
    }
    
    await db.estimates.insert_one(estimate_doc)
    
    await log_audit(user.user_id, user.name, "create", "estimate", estimate_id, estimate_number, {})
    
    return Estimate(**estimate_doc)

@api_router.get("/estimates", response_model=List[Estimate])
async def get_estimates(
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    await get_current_user(request, session_token)
    
    query = {}
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    
    estimates = await db.estimates.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Estimate(**e) for e in estimates]

@api_router.get("/estimates/{estimate_id}", response_model=Estimate)
async def get_estimate(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    return Estimate(**estimate)

@api_router.put("/estimates/{estimate_id}", response_model=Estimate)
async def update_estimate(
    estimate_id: str,
    estimate_data: EstimateCreate,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    if estimate.get('status') == 'converted':
        raise HTTPException(status_code=400, detail="No se puede editar un estimado convertido a factura")
    
    # Get project name if project_id provided
    project_name = None
    if estimate_data.project_id:
        project = await db.projects.find_one({"project_id": estimate_data.project_id}, {"_id": 0, "name": 1})
        if project:
            project_name = project.get('name')
    
    # Calculate totals
    subtotal = sum(item.amount for item in estimate_data.items)
    discount_amount = subtotal * (estimate_data.discount_percent / 100)
    taxable_amount = subtotal - discount_amount
    tax_amount = taxable_amount * (estimate_data.tax_rate / 100)
    total = taxable_amount + tax_amount
    
    update_data = {
        "project_id": estimate_data.project_id,
        "project_name": project_name,
        "client_name": estimate_data.client_name,
        "client_email": estimate_data.client_email,
        "client_phone": estimate_data.client_phone,
        "client_address": estimate_data.client_address,
        "title": estimate_data.title,
        "description": estimate_data.description,
        "items": [item.model_dump() for item in estimate_data.items],
        "subtotal": round(subtotal, 2),
        "discount_percent": estimate_data.discount_percent,
        "discount_amount": round(discount_amount, 2),
        "tax_rate": estimate_data.tax_rate,
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
        "notes": estimate_data.notes,
        "terms": estimate_data.terms,
        "valid_until": estimate_data.valid_until
    }
    
    await db.estimates.update_one({"estimate_id": estimate_id}, {"$set": update_data})
    
    updated = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    await log_audit(user.user_id, user.name, "update", "estimate", estimate_id, estimate.get('estimate_number'), {})
    
    return Estimate(**updated)

@api_router.put("/estimates/{estimate_id}/status")
async def update_estimate_status(
    estimate_id: str,
    status: str = Query(...),
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    valid_statuses = ['draft', 'sent', 'approved', 'rejected', 'converted']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Debe ser uno de: {valid_statuses}")
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    update_data = {"status": status}
    now = datetime.now(timezone.utc).isoformat()
    
    if status == 'sent':
        update_data["sent_date"] = now
    elif status == 'approved':
        update_data["approved_date"] = now
    
    await db.estimates.update_one({"estimate_id": estimate_id}, {"$set": update_data})
    
    await log_audit(user.user_id, user.name, "update", "estimate", estimate_id, estimate.get('estimate_number'), {"status": status})
    
    return {"message": f"Estado actualizado a {status}"}

@api_router.post("/estimates/{estimate_id}/convert")
async def convert_estimate_to_invoice(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    if estimate.get('status') == 'converted':
        raise HTTPException(status_code=400, detail="Este estimado ya fue convertido a factura")
    
    if estimate.get('status') != 'approved':
        raise HTTPException(status_code=400, detail="Solo se pueden convertir estimados aprobados")
    
    # Generate invoice
    count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.now().year}-{str(count + 1).zfill(4)}"
    invoice_id = f"inv_{uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Convert estimate items to invoice items
    invoice_items = []
    for item in estimate.get('items', []):
        invoice_items.append({
            "description": item.get('description'),
            "hours": item.get('quantity', 1),
            "rate": item.get('unit_price'),
            "amount": item.get('amount')
        })
    
    invoice_doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "project_id": estimate.get('project_id') or '',
        "project_name": estimate.get('project_name') or estimate.get('title'),
        "client_name": estimate.get('client_name'),
        "client_email": estimate.get('client_email'),
        "items": invoice_items,
        "subtotal": estimate.get('subtotal'),
        "tax_rate": estimate.get('tax_rate'),
        "tax_amount": estimate.get('tax_amount'),
        "total": estimate.get('total'),
        "amount_paid": 0,
        "balance_due": estimate.get('total'),
        "status": "draft",
        "notes": estimate.get('notes'),
        "created_by": user.user_id,
        "created_at": now,
        "due_date": None,
        "sent_date": None,
        "paid_date": None
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    # Update estimate status
    await db.estimates.update_one(
        {"estimate_id": estimate_id},
        {"$set": {"status": "converted", "converted_invoice_id": invoice_id}}
    )
    
    await log_audit(user.user_id, user.name, "convert", "estimate", estimate_id, estimate.get('estimate_number'), {"invoice_id": invoice_id})
    
    return {"message": "Estimado convertido a factura exitosamente", "invoice_id": invoice_id, "invoice_number": invoice_number}

@api_router.post("/estimates/{estimate_id}/duplicate", response_model=Estimate)
async def duplicate_estimate(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    # Generate new estimate
    count = await db.estimates.count_documents({})
    new_estimate_number = f"EST-{datetime.now().year}-{str(count + 1).zfill(4)}"
    new_estimate_id = f"est_{uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    new_estimate = {
        **estimate,
        "estimate_id": new_estimate_id,
        "estimate_number": new_estimate_number,
        "status": "draft",
        "created_by": user.user_id,
        "created_by_name": user.name,
        "created_at": now,
        "sent_date": None,
        "approved_date": None,
        "converted_invoice_id": None
    }
    
    await db.estimates.insert_one(new_estimate)
    
    await log_audit(user.user_id, user.name, "duplicate", "estimate", new_estimate_id, new_estimate_number, {"original": estimate_id})
    
    return Estimate(**new_estimate)

@api_router.delete("/estimates/{estimate_id}")
async def delete_estimate(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    if estimate.get('status') == 'converted':
        raise HTTPException(status_code=400, detail="No se puede eliminar un estimado convertido a factura")
    
    await db.estimates.delete_one({"estimate_id": estimate_id})
    
    await log_audit(user.user_id, user.name, "delete", "estimate", estimate_id, estimate.get('estimate_number'), {})
    
    return {"message": "Estimado eliminado exitosamente"}

@api_router.post("/estimates/{estimate_id}/send")
async def send_estimate_email(
    estimate_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    estimate = await db.estimates.find_one({"estimate_id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimado no encontrado")
    
    if not estimate.get('client_email'):
        raise HTTPException(status_code=400, detail="El estimado no tiene email del cliente")
    
    # Update status and sent date
    await db.estimates.update_one(
        {"estimate_id": estimate_id},
        {"$set": {
            "status": "sent",
            "sent_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit(user.user_id, user.name, "update", "estimate", estimate_id, estimate.get('estimate_number'), {"action": "sent_email", "to": estimate.get('client_email')})
    
    return {"message": f"Estimado enviado a {estimate.get('client_email')}", "status": "sent"}

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    limit: int = 100,
    entity_type: Optional[str] = None,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    # Only admins can view audit logs
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver el historial")
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [AuditLog(**log) for log in logs]

@api_router.get("/integrations", response_model=List[IntegrationConfig])
async def get_integrations(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver integraciones")
    
    integrations = await db.integrations.find({}, {"_id": 0}).to_list(100)
    return [IntegrationConfig(**i) for i in integrations]

@api_router.post("/integrations", response_model=IntegrationConfig)
async def create_or_update_integration(
    integration_type: str,
    enabled: bool,
    config: dict,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden configurar integraciones")
    
    # Check if integration already exists
    existing = await db.integrations.find_one({"integration_type": integration_type}, {"_id": 0})
    
    if existing:
        # Update
        await db.integrations.update_one(
            {"integration_type": integration_type},
            {"$set": {
                "enabled": enabled,
                "config": config,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        integration_id = existing['integration_id']
    else:
        # Create
        integration_id = f"int_{uuid4().hex[:16]}"
        integration_doc = {
            "integration_id": integration_id,
            "integration_type": integration_type,
            "enabled": enabled,
            "config": config,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.integrations.insert_one(integration_doc)
    
    # Test Slack webhook if it's a Slack integration
    if integration_type == "slack" and enabled:
        webhook_url = config.get('webhook_url')
        if webhook_url:
            await send_slack_notification(
                webhook_url,
                "✅ Integración de Slack configurada exitosamente!",
                "Prueba de Conexión",
                "good"
            )
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "update" if existing else "create",
        "integration",
        integration_id,
        f"{integration_type} integration",
        {"enabled": enabled}
    )
    
    integration = await db.integrations.find_one({"integration_id": integration_id}, {"_id": 0})
    return IntegrationConfig(**integration)

@api_router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar integraciones")
    
    integration = await db.integrations.find_one({"integration_id": integration_id}, {"_id": 0})
    if not integration:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    
    await db.integrations.delete_one({"integration_id": integration_id})
    
    # Log audit
    await log_audit(
        user.user_id,
        user.name,
        "delete",
        "integration",
        integration_id,
        f"{integration.get('integration_type')} integration",
        {}
    )
    
    return {"message": "Integración eliminada exitosamente"}

@api_router.post("/integrations/test-slack")
async def test_slack_integration(
    webhook_url: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    user = await get_current_user(request, session_token)
    
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden probar integraciones")
    
    try:
        await send_slack_notification(
            webhook_url,
            "🎉 La conexión con Slack funciona correctamente!",
            "Prueba de Integración",
            "good"
        )
        return {"message": "Notificación de prueba enviada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al enviar notificación: {str(e)}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()