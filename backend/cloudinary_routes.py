"""
Cloudinary Integration Routes
Handles image uploads for: user profiles, project documents, company logos
With automatic web optimization
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import time
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from fastapi import APIRouter, Query, HTTPException, Request, Cookie, UploadFile, File
from typing import Optional
from pydantic import BaseModel

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

cloudinary_router = APIRouter(prefix="/cloudinary", tags=["Cloudinary"])

# Allowed folder paths for security
ALLOWED_FOLDERS = (
    "users/",
    "projects/", 
    "company/",
    "documents/",
    "uploads/"
)

class DeleteAssetRequest(BaseModel):
    public_id: str
    resource_type: str = "image"

@cloudinary_router.get("/signature")
async def generate_upload_signature(
    resource_type: str = Query("image", enum=["image", "video", "raw"]),
    folder: str = Query("uploads"),
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    """
    Generate a signed upload signature for Cloudinary.
    Frontend uses this to upload directly to Cloudinary.
    """
    # Validate folder path
    if not any(folder.startswith(allowed) for allowed in ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Ruta de carpeta no permitida")
    
    timestamp = int(time.time())
    
    # Parameters for signature - include optimization transformations
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    # Generate signature
    signature = cloudinary.utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

@cloudinary_router.get("/config")
async def get_cloudinary_config():
    """
    Get public Cloudinary configuration for frontend.
    Does NOT expose API Secret.
    """
    return {
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY")
    }

@cloudinary_router.delete("/delete")
async def delete_asset(
    data: DeleteAssetRequest,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    """
    Delete an asset from Cloudinary.
    Only authenticated users can delete assets.
    """
    try:
        result = cloudinary.uploader.destroy(
            data.public_id,
            resource_type=data.resource_type,
            invalidate=True
        )
        
        if result.get("result") == "ok":
            return {"message": "Archivo eliminado exitosamente", "result": result}
        else:
            return {"message": "No se pudo eliminar el archivo", "result": result}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")

def get_optimized_url(public_id: str, resource_type: str = "image", transformations: dict = None) -> str:
    """
    Generate an optimized Cloudinary URL with automatic format and quality.
    
    Args:
        public_id: The Cloudinary public ID of the asset
        resource_type: "image", "video", or "raw"
        transformations: Optional dict with width, height, crop mode, etc.
    
    Returns:
        Optimized CDN URL
    """
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    # Default optimizations for web
    default_transforms = "q_auto,f_auto"
    
    if transformations:
        transform_parts = [default_transforms]
        
        if transformations.get("width"):
            transform_parts.append(f"w_{transformations['width']}")
        if transformations.get("height"):
            transform_parts.append(f"h_{transformations['height']}")
        if transformations.get("crop"):
            transform_parts.append(f"c_{transformations['crop']}")
        if transformations.get("gravity"):
            transform_parts.append(f"g_{transformations['gravity']}")
        if transformations.get("radius"):
            transform_parts.append(f"r_{transformations['radius']}")
            
        transform_string = ",".join(transform_parts)
    else:
        transform_string = default_transforms
    
    return f"https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transform_string}/{public_id}"

def get_thumbnail_url(public_id: str, width: int = 150, height: int = 150) -> str:
    """Generate a thumbnail URL for an image."""
    return get_optimized_url(public_id, "image", {
        "width": width,
        "height": height,
        "crop": "fill",
        "gravity": "auto"
    })

def get_profile_image_url(public_id: str, size: int = 200) -> str:
    """Generate an optimized profile image URL with face detection."""
    return get_optimized_url(public_id, "image", {
        "width": size,
        "height": size,
        "crop": "fill",
        "gravity": "face"
    })
