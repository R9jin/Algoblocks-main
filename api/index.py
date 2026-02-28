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
        self.loop_depth = 0     
        self.max_complexity = 0 
        self.custom_functions = {} 
        self.current_function_name = None  
        self.recursive_calls_count = 0
        self.symbol_table = {}
        
        # --- NEW: Structural Trackers ---
        self.has_recursion_in_loop = False
        self.has_slicing = False
        self.has_loop = False # <--- ADD THIS

        self.builtin_complexities = {
            'sort': 'O(n log n)',
            'join': 'O(n)',
            'index': 'O(n)',
            'count': 'O(n)',
            'remove': 'O(n)',
            'reverse': 'O(n)',
            'copy': 'O(n)',
            'clear': 'O(1)',
            'append': 'O(1)'
        }

    # --- UPGRADED BFS PASS: Building a Call Graph ---
    def bfs_first_pass(self, tree):
        """
        Pass 1: Breadth-First Search to map all functions AND build a call graph.
        This detects Indirect Recursion (A calls B, B calls A) which Blockly cannot do.
        """
        # Store tuples of (Node, Enclosing_Function_Name)
        queue = deque([(tree, None)]) 
        self.call_graph = {} # Dictionary to store who calls who
        
        while queue:
            current_node, current_func = queue.popleft()
            
            # 1. Map Function Definitions
            if isinstance(current_node, ast.FunctionDef):
                self.symbol_table[current_node.name] = current_node
                current_func = current_node.name
                if current_func not in self.call_graph:
                    self.call_graph[current_func] = set()
            
            # 2. Map Function Calls (Who is calling who?)
            elif isinstance(current_node, ast.Call) and isinstance(current_node.func, ast.Name):
                called_func = current_node.func.id
                if current_func: # If this call happened inside a function definition
                    self.call_graph[current_func].add(called_func)
                    
            # Queue children, passing down the current function context
            for child in ast.iter_child_nodes(current_node):
                queue.append((child, current_func))
                
        # 3. Detect Indirect Recursion using the built graph
        self.detect_indirect_recursion()

    def detect_indirect_recursion(self):
        """Helper to find cycles in the call graph using a simple DFS path check"""
        for func in self.call_graph:
            visited = set()
            if self._has_cycle(func, visited):
                # Pre-emptively mark this as highly complex!
                self.custom_functions[func] = "O(2^n)" 

    def _has_cycle(self, current_func, visited):
        if current_func in visited:
            return True
        visited.add(current_func)
        for neighbor in self.call_graph.get(current_func, []):
            if self._has_cycle(neighbor, visited.copy()):
                return True
        return False

    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        # Recurrence Relations (e.g., T(n) = n * T(n-1) + O(1))
        if "T(n) =" in complexity_str: return "#8e44ad" # Dark Purple
        if "n!" in complexity_str: return "#8e44ad" # Dark Purple
        if "2^n" in complexity_str: return "#9b59b6" # Purple
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c" # Red
        if "log" in complexity_str: return "#2980b9" # Blue
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22" # Orange
        return "#27ae60" # Green

    def record_line(self, node, complexity_override=None):
        is_loop_header = isinstance(node, (ast.For, ast.While))
        
        # Determine the string to show in the UI
        if complexity_override:
            comp_str = complexity_override
        elif is_loop_header:
            comp_str = f"O(n^{self.loop_depth})" if self.loop_depth > 1 else "O(n)"
        else:
            comp_str = "O(1)"

        # Get the color based on that string
        color = self.get_color(comp_str)
        line_text = self.get_code_snippet(node)

        # Use 'current_weight' to track the mathematical total for the badge
        current_weight = self.loop_depth
        if complexity_override:
            if "n * T(n-1)" in comp_str or "n!" in comp_str: current_weight = 100
            elif "2^n" in comp_str or "2T(" in comp_str: current_weight = 99
            elif "n log n" in comp_str: current_weight = max(current_weight, 2)
            elif "O(n)" in comp_str or "T(n" in comp_str: current_weight = max(current_weight, 1)

        # Update the details list with the color included
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            self.details[-1]["complexity"] = comp_str
            self.details[-1]["color"] = color
        else:
            self.details.append({
                "lineOfCode": line_text,
                "complexity": comp_str,
                "indent": self.current_depth,
                "color": color # This is what the frontend uses for styling
            })

        if current_weight > self.max_complexity:
            self.max_complexity = current_weight
            
    def visit_FunctionDef(self, node):
        self.current_function_name = node.name 
        self.recursive_calls_count = 0 
        self.has_recursion_in_loop = False 
        self.has_slicing = False           
        self.has_loop = False
        
        self.record_line(node, complexity_override="O(1)") 
        
        previous_max = self.max_complexity
        self.max_complexity = 0
        
        self.current_depth += 1 
        self.generic_visit(node)
        self.current_depth -= 1
        
        # Determine the relation based on structural flags
        if self.has_recursion_in_loop:
            # e.g., Permutations (Recursion inside O(n) loop)
            relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2:
            if self.has_slicing:
                # e.g., Merge Sort
                relation = "T(n) = 2T(n/2) + O(n)"
            else:
                # e.g., Fibonacci
                relation = "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            # e.g., Linear Recursion
            relation = "T(n) = T(n-1) + O(1)"
        else:
            # Standard non-recursive
            relation = f"O(n^{self.max_complexity})" if self.max_complexity > 0 else "O(1)"
            
        self.custom_functions[node.name] = relation
        self.max_complexity = max(previous_max, self.max_complexity)
        self.current_function_name = None

    def visit_For(self, node):
        self.has_loop = True      # <--- ADD THIS
        self.loop_depth += 1      
        self.record_line(node)    
        
        self.current_depth += 1   
        self.generic_visit(node)  
        self.current_depth -= 1   
        
        self.loop_depth -= 1      

    def visit_While(self, node):
        self.has_loop = True      # <--- ADD THIS
        self.loop_depth += 1      
        self.record_line(node)
        
        self.current_depth += 1   
        self.generic_visit(node)
        self.current_depth -= 1
        
        self.loop_depth -= 1

    def visit_If(self, node):
        self.record_line(node)
        
        self.current_depth += 1   # Safely indent 'if' bodies!
        self.generic_visit(node)
        self.current_depth -= 1

    def visit_Expr(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def visit_Call(self, node):
        # 1. Handle Function Calls (ast.Name) - like list(word) or print()
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            
            # RECURSION CHECK (Educational T(n-1) notation)
            if func_name == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0:
                    self.has_recursion_in_loop = True
                self.record_line(node, complexity_override="T(n-1)")
            
            # BUILT-IN FUNCTION CHECK (from dict)
            elif func_name in self.builtin_complexities:
                self.record_line(node, complexity_override=self.builtin_complexities[func_name])
            
            # CUSTOM FUNCTION CHECK (calculated in BFS pass)
            elif func_name in self.custom_functions:
                self.record_line(node, complexity_override=self.custom_functions[func_name])

        # 2. Handle Method Calls (ast.Attribute) - like "".join(chars)
        elif isinstance(node.func, ast.Attribute):
            method_name = node.func.attr
            
            # Check if the method name exists in our centralized dictionary
            if method_name in self.builtin_complexities:
                self.record_line(node, complexity_override=self.builtin_complexities[method_name])
                
        self.generic_visit(node)

    def visit_Return(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def get_final_badge(self):
        # Scan through recorded lines to find the most complex relation
        for line in reversed(self.details):
            comp = line.get('complexity', '')
            if "T(n) =" in comp:
                return comp
        
        # Fallback to standard Big-O for non-recursive code
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

    def visit_Subscript(self, node):
        # Detects structural array slicing like arr[:mid] or arr[mid:]
        if isinstance(node.slice, ast.Slice):
            self.has_slicing = True
        self.generic_visit(node)

    def visit_Assign(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        # This catches i += 1, total *= 2, etc.
        self.record_line(node)
        self.generic_visit(node)

# In api/index.py
@app.post("/api/analyze") 
@app.post("/analyze")
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)
        analyzer = ComplexityAnalyzer(payload.code)
        
        # 1. Map all functions
        analyzer.bfs_first_pass(tree)
        
        # 2. PRE-COMPUTE: Calculate math for all functions
        # We store the results in analyzer.custom_functions
        for func_name, func_node in analyzer.symbol_table.items():
            analyzer.visit(func_node)
            
        # 3. RESET ONLY VISUALS: Keep custom_functions!
        analyzer.details = []
        analyzer.max_complexity = 0
        analyzer.current_depth = 0
        analyzer.loop_depth = 0
        
        # 4. FINAL PASS: Now use the stored math to build the table
        analyzer.visit(tree)
        
        return {
            "status": "success",
            "total": analyzer.get_final_badge(),
            "lines": analyzer.details
        }

    except Exception as e:
        print(f"Analyzer Error: {e}") 
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