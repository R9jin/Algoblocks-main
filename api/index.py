# api/index.py
from fastapi import FastAPI, HTTPException
import sys
import os
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from blockly_ast import BlocklyASTConverter
from pydantic import BaseModel
import ast
import requests # Add this to the top of your file with the other imports

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import projects_collection, users_collection
from models import ProjectModel, ProjectUpdate           
from bson import ObjectId                 

# Import the newly separated ComplexityAnalyzer
from analyzer import ComplexityAnalyzer

app = FastAPI()  

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_credentials=True,     
    allow_methods=["*"],        
    allow_headers=["*"],        
)

class CodePayload(BaseModel):
    code: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str

class ProgressRequest(BaseModel):
    email: str
    lesson_id: str
    score: int
    
class GoogleAuthRequest(BaseModel):
    access_token: str

class AstRequest(BaseModel):
    code: str

@app.post("/api/ast-to-blocks")
async def ast_to_blocks(request: AstRequest):
    try:
        converter = BlocklyASTConverter()
        # Just return the JSON directly! No extra wrappers.
        return converter.convert(request.code)
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/analyze")
@app.post("/analyze")
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)                 
        analyzer = ComplexityAnalyzer(payload.code)   

        analyzer.bfs_first_pass(tree)                 
        for name, node in analyzer.symbol_table.items():
            analyzer.visit(node)                      

        analyzer.details = []
        analyzer.max_complexity, analyzer.max_space_weight = 0, 0
        analyzer.max_poly, analyzer.max_log, analyzer.max_sqrt = 0, 0, 0
        analyzer.current_depth, analyzer.loop_depth, analyzer.log_loop_depth, analyzer.sqrt_loop_depth = 0, 0, 0, 0
        analyzer.visit(tree)                           

        is_recursive = any("T(n) =" in line.get('global_time', '') for line in analyzer.details)

        asymptotic_lines = []
        
        def to_asymp(comp):
            asymp = comp
            if not comp: return "-"
            if "T(n) = n * T(n-1)" in comp: asymp = "O(n!)"
            elif "2T(n/2)" in comp: asymp = "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp: asymp = "O(2^n)"
            elif "T(n/2) + O(1)" in comp: asymp = "O(log n)"   
            elif "T(n-1) + O(n)" in comp: asymp = "O(n^2)"     
            elif "T(n) = T(n/2) + O(n)" in comp: asymp = "O(n)"
            elif "T(n) = 2T(n/2) + O(1)" in comp: asymp = "O(n)"
            elif "T(n-1)" in comp: asymp = "O(n)"
            return asymp

        for line in analyzer.details:
            asymptotic_lines.append({
                "lineOfCode": line["lineOfCode"],
                "operation": line.get("operation", "-"),
                "local_time": to_asymp(line.get("local_time", "-")),
                "global_time": to_asymp(line.get("global_time", "-")),
                "local_space": to_asymp(line.get("local_space", "-")),
                "global_space": to_asymp(line.get("global_space", "-")),
                "indent": line.get("indent", 0),
                "color": line.get("color", analyzer.get_color(to_asymp(line.get("global_time", "-")))),
                "weight": line.get("weight", 0),
                "local_explanation": line.get("local_explanation", ""),
                "global_explanation": line.get("global_explanation", "")
            })

        return {
            "status": "success",
            "total": analyzer.get_final_asymptotic_badge(),   
            "total_recurrence": analyzer.get_final_badge(),   
            "lines": asymptotic_lines,                        
            "space_total": "O(n)" if analyzer.max_space_weight > 0 else "O(1)",  
            "is_recursive": is_recursive                       
        }
    except Exception as e:
        return {"status": "error", "total": "Error", "total_recurrence": "Error", "lines": [], "is_recursive": False}

@app.post("/api/run")
@app.post("/run")
def run_code(payload: CodePayload):
    old_stdout = sys.stdout                    
    redirected_output = sys.stdout = StringIO()  
    try:
        exec_globals = {}                     
        exec(payload.code, exec_globals)      
        output = redirected_output.getvalue() or "> Code ran successfully."
    except Exception as e:
        output = f"Runtime Error: {str(e)}"   
    finally:
        sys.stdout = old_stdout                
    return {"status": "success", "output": output}

@app.post("/api/projects")
@app.post("/projects")
def save_project(project: ProjectModel):
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    project_dict = project.model_dump()         
    result = projects_collection.insert_one(project_dict)  
    return {"status": "success", "message": "Project saved!", "id": str(result.inserted_id)}

@app.get("/api/projects")
@app.get("/projects")
def get_projects():
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    projects = list(projects_collection.find({}))  
    for p in projects:
        p["_id"] = str(p["_id"])                 
    return {"status": "success", "projects": projects}

@app.post("/api/login")
def login_user(req: LoginRequest):
    print(f"Trying to log in with email: '{req.email}' and password: '{req.password}'")
    
    user = users_collection.find_one({"email": req.email})
    print(f"MongoDB returned: {user}")
    
    if user and user.get("password") == req.password:
        return {"status": "success", "email": req.email, "name": user.get("name"), "progress": user.get("progress", {})}
    
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.post("/api/signup")
@app.post("/signup")
def signup_user(req: SignUpRequest):
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    existing_user = users_collection.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = {
        "name": req.name,
        "email": req.email,
        "password": req.password
    }
    users_collection.insert_one(new_user)
    return {"status": "success", "message": "User created successfully"}

@app.post("/api/update-progress")
def update_progress(req: ProgressRequest):
    update_query = {"$set": {f"progress.{req.lesson_id}": req.score}}
    result = users_collection.update_one({"email": req.email}, update_query)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    updated_user = users_collection.find_one({"email": req.email})
    return {
        "status": "success", 
        "message": "Progress saved",
        "progress": updated_user.get("progress", {}) if updated_user else {}
    }

@app.delete("/api/projects/{project_id}")
@app.delete("/projects/{project_id}")
def delete_project(project_id: str):
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        result = projects_collection.delete_one({"_id": ObjectId(project_id)})
        if result.deleted_count == 1:
            return {"status": "success", "message": "Project deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

@app.put("/api/projects/{project_id}")
@app.put("/projects/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate):
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"data": payload.data}}
        )
        if result.matched_count == 1:
            return {"status": "success", "message": "Project updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid update request format")

@app.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest):
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # 1. Verify the token with Google's servers
    google_response = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {req.access_token}"}
    )
    
    if not google_response.ok:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    google_user = google_response.json()
    email = google_user.get("email")
    name = google_user.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    # 2. Check if the user already exists in your MongoDB
    user = users_collection.find_one({"email": email})
    
    if not user:
        # 3. If they don't exist, create a new account for them automatically
        user = {
            "name": name,
            "email": email,
            "password": "", # Leave password empty for OAuth users
            "progress": {}
        }
        users_collection.insert_one(user)

    # 4. Return the standard login payload
    return {
        "status": "success", 
        "email": email, 
        "name": name, 
        "progress": user.get("progress", {})
    }