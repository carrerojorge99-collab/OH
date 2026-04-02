# EHS Backend Roles & Permissions
# Environment, Health & Safety role definitions

# Role constants
class EHSRoles:
    PROJECT_MANAGER = "project_manager"
    RRHH = "rrhh"
    SUPER_ADMIN = "super_admin"
    EMPLEADO = "empleado"
    CLIENT = "client"
    ACCOUNTANT = "accountant"
    PM_ESTIMATOR = "pm_estimator"
    SUPERVISOR = "supervisor"
    DESIGNER = "designer"
    EHS = "ehs"

# EHS-specific permissions
EHS_PERMISSIONS = {
    "ehs": [
        "clock_in_out",
        "view_own_hours",
        "view_own_history",
        "view_assigned_projects",
        "view_projects",
        "upload_docs",
        "view_safety",
        "manage_safety",
        "view_quality",
        "manage_quality",
        "view_inspections",
        "manage_inspections"
    ]
}

# EHS navigation paths (frontend reference)
EHS_ALLOWED_PATHS = [
    '/dashboard',
    '/clock',
    '/my-profile',
    '/my-requests',
    '/projects'
]

# EHS role description
EHS_ROLE_INFO = {
    "name": "EHS",
    "full_name": "Environment, Health & Safety",
    "description": "Access to projects, documents, and safety modules only. No financial access.",
    "can_view_financial": False,
    "badge_color": "bg-lime-100 text-lime-700 border-lime-200"
}

def get_ehs_permissions(role):
    """Get permissions for EHS role"""
    return EHS_PERMISSIONS.get(role, [])
