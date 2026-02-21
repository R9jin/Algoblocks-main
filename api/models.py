from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

# Pydantic models define the structure of the data we expect from the React frontend

class ProjectModel(BaseModel):
    title: str
    data: Dict[str, Any] = Field(default_factory=dict) # This will hold your Blockly JSON tree
    created_at: datetime = Field(default_factory=datetime.utcnow)
    owner_id: Optional[str] = None

class UserModel(BaseModel):
    username: str
    hashed_password: str