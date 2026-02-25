from fastapi import FastAPI, HTTPException
import sys
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
from database import projects_collection
from models import ProjectModel
from bson import ObjectId
from collections import deque

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

class ComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self, source_code):
        self.source_lines = source_code.splitlines()
        self.details = []       
        self.current_depth = 0  
        self.max_complexity = 0 
        self.custom_functions = {} 
        self.current_function_name = None  
        self.recursive_calls_count = 0
        
        # --- NEW: Symbol Table for BFS Pass ---
        self.symbol_table = {} 

    # --- NEW: The BFS Algorithm Pass ---
    def bfs_first_pass(self, tree):
        """
        Pass 1: Breadth-First Search to map all functions before deep DFS analysis.
        This solves the 'Forward Reference' problem.
        """
        queue = deque([tree])
        
        while queue:
            current_node = queue.popleft()
            
            # If the BFS finds a function, register it in the global map
            if isinstance(current_node, ast.FunctionDef):
                self.symbol_table[current_node.name] = current_node
                
            # Queue all immediate children for the next level of BFS
            for child in ast.iter_child_nodes(current_node):
                queue.append(child)

    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        if "2^n" in complexity_str: return "#9b59b6" # Purple for Exponential
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c" # Red
        if "log" in complexity_str: return "#2980b9" # Blue
        if "O(n)" in complexity_str: return "#e67e22" # Orange
        return "#27ae60" # Green

    def record_line(self, node, complexity_override=None):
        power = self.current_depth
        if complexity_override:
            comp_str = complexity_override
        elif power == 0: comp_str = "O(1)"
        elif power == 1: comp_str = "O(n)"
        else: comp_str = f"O(n^{power})"

        color = self.get_color(comp_str)
        line_text = self.get_code_snippet(node)

        # --- THE FIX: Prevent Duplicate Lines ---
        # Check if we already recorded this exact line of code
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            # Instead of adding a new line, UPDATE the previous one's complexity
            self.details[-1]["complexity"] = comp_str
            self.details[-1]["color"] = color
        else:
            # Add it as a normal new line
            self.details.append({
                "lineOfCode": line_text,
                "complexity": comp_str,
                "indent": self.current_depth,
                "color": color
            })

        if not complexity_override and power > self.max_complexity:
            self.max_complexity = power

    def visit_FunctionDef(self, node):
        self.current_function_name = node.name 
        self.recursive_calls_count = 0 # Reset count for the new function
        self.record_line(node, complexity_override="O(1)")
        
        previous_max = self.max_complexity
        self.max_complexity = 0
        self.generic_visit(node)
        
        func_max_power = self.max_complexity 
        
        # --- IMPROVED RECURSION LOGIC ---
        if self.recursive_calls_count > 1:
            # Multiple recursive calls (like Fibonacci) = Exponential
            self.custom_functions[node.name] = "O(2^n)"
        elif self.recursive_calls_count == 1:
            # Single recursive call = Linear (or check for merge sort)
            if "merge" in node.name:
                self.custom_functions[node.name] = "O(n log n)"
            else:
                self.custom_functions[node.name] = "O(n)"
        else:
            # Standard iterative complexity
            if func_max_power == 0: 
                comp_str = "O(1)"
            elif func_max_power == 1: 
                comp_str = "O(n)"
            else: 
                comp_str = f"O(n^{func_max_power})"
            self.custom_functions[node.name] = comp_str
        
        self.max_complexity = max(previous_max, func_max_power)
        self.current_function_name = None

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            
            # Check if this is a recursive call
            if func_name == self.current_function_name:
                self.recursive_calls_count += 1
                self.record_line(node, complexity_override="O(2^n)" if self.recursive_calls_count > 1 else "O(n)")
                return
            
            # Check if it's a function we've already deeply evaluated
            if func_name in self.custom_functions:
                self.record_line(node, complexity_override=self.custom_functions[func_name])
                return
                
            # --- NEW: Check the BFS Symbol Table for Forward References ---
            # If the function exists in the file (found by BFS) but hasn't been deeply analyzed yet
            if func_name in self.symbol_table:
                self.record_line(node, complexity_override=f"Call to {func_name}()")
                return

        self.generic_visit(node)

    def visit_For(self, node):
        self.current_depth += 1
        self.record_line(node) 
        self.generic_visit(node) 
        self.current_depth -= 1

    def visit_While(self, node):
        self.current_depth += 1
        self.record_line(node)
        self.generic_visit(node)
        self.current_depth -= 1

    def visit_If(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call):
            if isinstance(node.value.func, ast.Name):
                func_name = node.value.func.id
                if func_name in self.custom_functions:
                    self.record_line(node, complexity_override=self.custom_functions[func_name])
                    return
        self.record_line(node)

    def get_final_badge(self):
        # 1. Check if any line was recorded as exponential
        if any("2^n" in str(d.get('complexity')) for d in self.details):
            return "O(2^n)"
        
        # 2. Check for N Log N (Merge Sort)
        if any("O(n log n)" in str(d.get('complexity')) for d in self.details):
            return "O(n log n)"
        
        # 3. Fallback to loop-based complexity
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

# In api/index.py
@app.post("/api/analyze") 
@app.post("/analyze")     
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)
        analyzer = ComplexityAnalyzer(payload.code)
        
        # --- THE MULTI-PASS ARCHITECTURE ---
        # Pass 1: BFS constructs the global context map
        analyzer.bfs_first_pass(tree)
        
        # Pass 2: DFS dives deep to calculate rules and multiplier propagation
        analyzer.visit(tree)
        
        return {
            "status": "success",
            "total": analyzer.get_final_badge(),
            "lines": analyzer.details
        }
    except Exception as e:
        print(f"Analyzer Error: {e}") # Helpful for debugging!
        return {"status": "error", "total": "Error", "lines": []}
    
@app.post("/api/run")
@app.post("/run")     # 🔥 ADD THIS: Fallback in case Vercel strips the path
def run_code(payload: CodePayload):
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()
    try:
        exec_globals = {}
        exec(payload.code, exec_globals)
        output = redirected_output.getvalue()
        if not output:
            output = "> Code ran successfully."
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
    
    # Convert Pydantic model to a dictionary
    project_dict = project.model_dump()
    
    # Insert into MongoDB
    result = projects_collection.insert_one(project_dict)
    
    return {
        "status": "success", 
        "message": "Project saved!", 
        "id": str(result.inserted_id)
    }

@app.get("/api/projects")
@app.get("/projects")
def get_projects():
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # Fetch all projects from the collection
    projects = list(projects_collection.find({}))
    
    # MongoDB returns _id as an ObjectId, we need to convert it to a string for JSON
    for p in projects:
        p["_id"] = str(p["_id"])
        
    return {"status": "success", "projects": projects}