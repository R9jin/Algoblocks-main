from pydantic import BaseModel
from typing import Optional

class ProjectModel(BaseModel):
    title: str
    description: Optional[str] = "" 
    data: dict
    owner_id: str

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None 
    data: Optional[dict] = None

# --- NEW: System Template Models ---
class TemplateModel(BaseModel):
    title: str
    description: Optional[str] = ""
    data: dict
    # Note: No owner_id here because templates are global to the system!

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None