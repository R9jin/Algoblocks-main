# api/index.py
import threading
import queue
import sys
import os
import asyncio
from io import StringIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import requests 

# Local imports
from blockly_ast import BlocklyASTConverter
from database import projects_collection, users_collection, templates_collection
from models import ProjectModel, ProjectUpdate, TemplateModel, TemplateUpdate
from bson import ObjectId
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

# Helper to ensure consistent code cleaning across all endpoints
def clean_python_code(code: str) -> str:
    return code.replace('\xa0', ' ').replace('\u200b', '').replace('\t', '    ')

@app.post("/api/ast-to-blocks")
async def ast_to_blocks(request: AstRequest):
    try:
        cleaned = clean_python_code(request.code)
        converter = BlocklyASTConverter()
        return converter.convert(cleaned)
    except SyntaxError as e:
        return {"status": "error", "error_type": "SyntaxError", "line": e.lineno, "message": e.msg}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/analyze")
def analyze_complexity(payload: CodePayload):
    try:
        # Use the same cleaning logic here
        cleaned_code = clean_python_code(payload.code)
        tree = ast.parse(cleaned_code)
        analyzer = ComplexityAnalyzer(cleaned_code)

        analyzer.bfs_first_pass(tree)
        for name, node in analyzer.symbol_table.items():
            analyzer.visit(node)

        analyzer.details = []
        analyzer.max_complexity, analyzer.max_space_weight = 0, 0
        analyzer.visit(tree)

        is_recursive = any("T(n) =" in line.get('global_time', '') for line in analyzer.details)
        asymptotic_lines = []
        
        def to_asymp(comp):
            if not comp: return "-"
            mapping = {
                "T(n) = n * T(n-1)": "O(n!)",
                "2T(n/2)": "O(n log n)",
                "T(n-1) + T(n-2)": "O(2^n)",
                "T(n/2) + O(1)": "O(log n)",
                "T(n-1) + O(n)": "O(n^2)",
                "T(n) = T(n/2) + O(n)": "O(n)",
                "T(n) = 2T(n/2) + O(1)": "O(n)",
                "T(n-1)": "O(n)"
            }
            for key, val in mapping.items():
                if key in comp: return val
            return comp

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
                "local_explanation": line.get("local_explanation", ""),
                "global_explanation": line.get("global_explanation", "")
            })

        return {
            "status": "success",
            "total": analyzer.get_final_asymptotic_badge(),
            "lines": asymptotic_lines,
            "space_total": "O(n)" if analyzer.max_space_weight > 0 else "O(1)",
            "is_recursive": is_recursive
        }
    except SyntaxError as e:
        return {
            "status": "error", "error_type": "SyntaxError", "line": e.lineno, "message": e.msg,
            "total": "Syntax Error", "space_total": "-", "lines": [], "is_recursive": False
        }
    except Exception as e:
        return {"status": "error", "total": "Error", "lines": [], "is_recursive": False}

@app.post("/api/run")
@app.post("/run")
def run_code(payload: CodePayload):
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()
    
    # 1. Create a fake input function
    def simulated_input(prompt=""):
        print(prompt, end="") # Print the prompt so the user sees it in the console
        print(" [Simulated User Input]") # Show what was "typed"
        return "Simulated User Input"

    try:
        # 2. Inject the fake input function into the execution environment
        exec_globals = {"input": simulated_input}
        
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
    user = users_collection.find_one({"email": req.email})
    if user and user.get("password") == req.password:
        return {"status": "success", "email": req.email, "name": user.get("name"), "progress": user.get("progress", {})}
    
    raise HTTPException(status_code=401, detail="Invalid email or password")

# api/index.py (Update the signup_user function)

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
        "password": req.password,
        "progress": {} # Initialize empty progress
    }
    users_collection.insert_one(new_user)
    
    # FIX: Return the email and name so the frontend can store them
    return {
        "status": "success", 
        "message": "User created successfully",
        "email": req.email,
        "name": req.name
    }

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
        update_data = {}
        if payload.data is not None: update_data["data"] = payload.data
        if payload.title is not None: update_data["title"] = payload.title
        if payload.description is not None: update_data["description"] = payload.description

        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
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

    user = users_collection.find_one({"email": email})
    
    if not user:
        user = {
            "name": name,
            "email": email,
            "password": "",
            "progress": {}
        }
        users_collection.insert_one(user)

    return {
        "status": "success",
        "email": email,
        "name": name,
        "progress": user.get("progress", {})
    }
    
@app.post("/api/templates")
@app.post("/templates")
def save_template(template: TemplateModel):
    if templates_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    template_dict = template.model_dump()
    result = templates_collection.insert_one(template_dict)
    return {"status": "success", "message": "Template saved!", "id": str(result.inserted_id)}

@app.get("/api/templates")
@app.get("/templates")
def get_templates():
    if templates_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    templates = list(templates_collection.find({}))
    for t in templates:
        t["_id"] = str(t["_id"])
    return {"status": "success", "templates": templates}

@app.delete("/api/templates/{template_id}")
@app.delete("/templates/{template_id}")
def delete_template(template_id: str):
    if templates_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        from bson import ObjectId
        result = templates_collection.delete_one({"_id": ObjectId(template_id)})
        if result.deleted_count == 1:
            return {"status": "success", "message": "Template deleted"}
        else:
            raise HTTPException(status_code=404, detail="Template not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ID format")

@app.put("/api/templates/{template_id}")
@app.put("/templates/{template_id}")
def update_template(template_id: str, payload: TemplateUpdate):
    if templates_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        from bson import ObjectId
        update_data = {}
        if payload.data is not None: update_data["data"] = payload.data
        if payload.title is not None: update_data["title"] = payload.title
        if payload.description is not None: update_data["description"] = payload.description

        result = templates_collection.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )
        return {"status": "success", "message": "Template updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid update")
    
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/api/ws/run")
async def websocket_run(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_running_loop()
    
    # This queue holds the user's input until Python is ready for it
    input_queue = queue.Queue()

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "run":
                code = data["code"]

                # 1. Custom input function to pause Python and ask React
                def custom_input(prompt=""):
                    # Tell frontend to show the input box
                    asyncio.run_coroutine_threadsafe(
                        websocket.send_json({"type": "input_request", "prompt": str(prompt)}), 
                        loop
                    ).result()
                    # PAUSE this thread until the user types something and hits Enter
                    return input_queue.get()

                # 2. Custom print function to send output to React in real-time
                class WSWriter:
                    def write(self, text):
                        if text:
                            asyncio.run_coroutine_threadsafe(
                                websocket.send_json({"type": "output", "data": text}), 
                                loop
                            )
                    def flush(self): pass

                # 3. Worker function that runs the code
                def worker():
                    old_stdout = sys.stdout
                    sys.stdout = WSWriter()
                    try:
                        # Inject our custom input function
                        exec(code, {"input": custom_input})
                        asyncio.run_coroutine_threadsafe(websocket.send_json({"type": "done"}), loop)
                    except Exception as e:
                        asyncio.run_coroutine_threadsafe(
                            websocket.send_json({"type": "error", "data": str(e)}), 
                            loop
                        )
                    finally:
                        sys.stdout = old_stdout

                # Start the code execution in a background thread so the server doesn't freeze
                threading.Thread(target=worker).start()

            # 4. Handle the response from the React frontend
            elif data["type"] == "input_response":
                # Feed the queue, which un-pauses `custom_input`
                input_queue.put(data["data"])

    except WebSocketDisconnect:
        print("Client disconnected")