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
        self.space_details = []     
        self.current_depth = 0  
        self.loop_depth = 0     
        self.max_complexity = 0 
        self.max_space_weight = 0   
        self.custom_functions = {} 
        self.custom_space = {}      
        self.current_function_name = None  
        self.recursive_calls_count = 0
        self.symbol_table = {}
        
        self.has_recursion_in_loop = False
        self.has_slicing = False

        self.builtin_complexities = {
            'sort': {'time': 'O(n log n)', 'space': 'O(n)'},
            'join': {'time': 'O(n)', 'space': 'O(n)'},
            'list': {'time': 'O(n)', 'space': 'O(n)'},
            'index': {'time': 'O(n)', 'space': 'O(1)'},
            'append': {'time': 'O(1)', 'space': 'O(1)'},
            'copy': {'time': 'O(n)', 'space': 'O(n)'}
        }

    def bfs_first_pass(self, tree):
        queue = deque([(tree, None)]) 
        self.call_graph = {}
        while queue:
            current_node, current_func = queue.popleft()
            if isinstance(current_node, ast.FunctionDef):
                self.symbol_table[current_node.name] = current_node
                current_func = current_node.name
                if current_func not in self.call_graph:
                    self.call_graph[current_func] = set()
            elif isinstance(current_node, ast.Call) and isinstance(current_node.func, ast.Name):
                called_func = current_node.func.id
                if current_func:
                    self.call_graph[current_func].add(called_func)
            for child in ast.iter_child_nodes(current_node):
                queue.append((child, current_func))
        self.detect_indirect_recursion()

    def detect_indirect_recursion(self):
        for func in self.call_graph:
            visited = set()
            if self._has_cycle(func, visited):
                self.custom_functions[func] = "O(2^n)" 

    def _has_cycle(self, current_func, visited):
        if current_func in visited: return True
        visited.add(current_func)
        for neighbor in self.call_graph.get(current_func, []):
            if self._has_cycle(neighbor, visited.copy()): return True
        return False

    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        if "T(n) =" in complexity_str or "n!" in complexity_str or "T(n-1) + T" in complexity_str: return "#8e44ad" 
        if "2^n" in complexity_str or "2T(" in complexity_str: return "#9b59b6" 
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c" 
        if "log" in complexity_str: return "#2980b9" 
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22" 
        return "#27ae60" 

    def record_line(self, node, time_override=None, space_override=None):
        is_loop_header = isinstance(node, (ast.For, ast.While))
        line_text = self.get_code_snippet(node)

        # 1. Determine Visual Strings
        time_str = time_override if time_override else (f"O(n^{self.loop_depth})" if is_loop_header and self.loop_depth > 1 else ("O(n)" if is_loop_header else "O(1)"))
        space_str = space_override if space_override else ("O(n)" if (self.has_slicing and not is_loop_header) or (self.current_function_name and self.recursive_calls_count > 0) else "O(1)")

        # 2. Ranking Weights
        t_weight = self.loop_depth
        if any(x in time_str for x in ["n * T", "n!", "2^n", "T(n-1) + T"]): t_weight = 100
        elif "2T(" in time_str: t_weight = 99
        elif "T(n) =" in time_str: t_weight = 98 # Catches linear recurrence relations
        elif "n log n" in time_str: t_weight = max(t_weight, 2)
        elif "O(n)" in time_str or "T(n" in time_str: t_weight = max(t_weight, 1)

        s_weight = 1 if "O(n)" in space_str else 0
        if "n!" in space_str or "T(n-1) + T" in space_str: s_weight = 100

        # 3. GROUPING mechanism: ONLY overwrite if the new operation is heavier (e.g. T(n) > O(1))
        # Time Pass
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            existing_weight = self.details[-1].get("weight", -1)
            if t_weight >= existing_weight:
                self.details[-1]["complexity"] = time_str
                self.details[-1]["color"] = self.get_color(time_str)
                self.details[-1]["weight"] = t_weight
        else:
            self.details.append({"lineOfCode": line_text, "complexity": time_str, "indent": self.current_depth, "color": self.get_color(time_str), "weight": t_weight})

        # Space Pass
        if self.space_details and self.space_details[-1]["lineOfCode"] == line_text:
            existing_s_weight = self.space_details[-1].get("weight", -1)
            if s_weight >= existing_s_weight:
                self.space_details[-1]["complexity"] = space_str
                self.space_details[-1]["color"] = self.get_color(space_str)
                self.space_details[-1]["weight"] = s_weight
        else:
            self.space_details.append({"lineOfCode": line_text, "complexity": space_str, "indent": self.current_depth, "color": self.get_color(space_str), "weight": s_weight})

        if t_weight > self.max_complexity: self.max_complexity = t_weight
        if s_weight > self.max_space_weight: self.max_space_weight = s_weight

    def visit_FunctionDef(self, node):
        self.current_function_name = node.name 
        self.recursive_calls_count = 0 
        self.has_recursion_in_loop = False 
        self.has_slicing = False           
        
        self.record_line(node, time_override="O(1)", space_override="O(1)") 
        
        prev_t, prev_s = self.max_complexity, self.max_space_weight
        self.max_complexity, self.max_space_weight = 0, 0
        
        self.current_depth += 1 
        self.generic_visit(node)
        self.current_depth -= 1
        
        if self.has_recursion_in_loop:
            relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2:
            relation = "T(n) = 2T(n/2) + O(n)" if self.has_slicing else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            relation = "T(n) = T(n-1) + O(1)"
        else:
            relation = f"O(n^{self.max_complexity})" if self.max_complexity > 0 else "O(1)"
            
        self.custom_functions[node.name] = relation
        self.custom_space[node.name] = "O(n)" if self.recursive_calls_count > 0 else "O(1)"
        self.max_complexity = max(prev_t, self.max_complexity)
        self.max_space_weight = max(prev_s, self.max_space_weight)
        self.current_function_name = None

    def visit_For(self, node):
        self.loop_depth += 1      
        self.record_line(node)    
        self.current_depth += 1   
        self.generic_visit(node)  
        self.current_depth -= 1   
        self.loop_depth -= 1      

    def visit_While(self, node):
        self.loop_depth += 1      
        self.record_line(node)
        self.current_depth += 1   
        self.generic_visit(node)
        self.current_depth -= 1
        self.loop_depth -= 1

    def visit_If(self, node):
        self.record_line(node)
        self.current_depth += 1   
        self.generic_visit(node)
        self.current_depth -= 1

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            f_id = node.func.id
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0: self.has_recursion_in_loop = True
                
                rel = self.custom_functions.get(f_id, "T(n-1)")
                self.record_line(node, time_override=rel, space_override="O(n)")
                
            elif f_id in self.builtin_complexities:
                b = self.builtin_complexities[f_id]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            elif f_id in self.custom_functions:
                self.record_line(node, time_override=self.custom_functions[f_id], space_override=self.custom_space.get(f_id, "O(1)"))
            else:
                self.record_line(node)
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.builtin_complexities:
                b = self.builtin_complexities[node.func.attr]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            else:
                self.record_line(node)
        self.generic_visit(node)

    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice): self.has_slicing = True
        self.generic_visit(node)

    def visit_Assign(self, node): self.record_line(node); self.generic_visit(node)
    def visit_AugAssign(self, node): self.record_line(node); self.generic_visit(node)
    def visit_Return(self, node): self.record_line(node); self.generic_visit(node)
    def visit_Expr(self, node): self.record_line(node); self.generic_visit(node)

    def get_final_badge(self):
        for line in reversed(self.details):
            if "T(n) =" in line.get('complexity', ''): return line['complexity']
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

    def get_final_asymptotic_badge(self):
        for line in reversed(self.details):
            comp = line.get('complexity', '')
            if "T(n) = n * T(n-1)" in comp: return "O(n!)"
            elif "2T(n/2)" in comp: return "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp: return "O(2^n)"
            elif "T(n-1)" in comp: return "O(n)"
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

@app.post("/api/analyze") 
@app.post("/analyze") 
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)
        analyzer = ComplexityAnalyzer(payload.code)
        
        analyzer.bfs_first_pass(tree)
        for name, node in analyzer.symbol_table.items():
            analyzer.visit(node)
            
        analyzer.details, analyzer.space_details = [], []
        analyzer.max_complexity, analyzer.max_space_weight = 0, 0
        analyzer.current_depth, analyzer.loop_depth = 0, 0
        analyzer.visit(tree)
        
        is_recursive = any("T(n) =" in line.get('complexity', '') for line in analyzer.details)

        asymptotic_lines = []
        for line in analyzer.details:
            comp = line['complexity']
            asymp = comp
            if "T(n) = n * T(n-1)" in comp: asymp = "O(n!)"
            elif "2T(n/2)" in comp: asymp = "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp: asymp = "O(2^n)"
            elif "T(n-1)" in comp: asymp = "O(n)"
            
            asymptotic_lines.append({
                "lineOfCode": line["lineOfCode"],
                "complexity": asymp,
                "indent": line.get("indent", 0),
                "color": analyzer.get_color(asymp),
                "weight": line.get("weight", 0)
            })

        return {
            "status": "success",
            "total": analyzer.get_final_asymptotic_badge(),
            "total_recurrence": analyzer.get_final_badge(),
            "lines": asymptotic_lines,
            "recurrence_lines": analyzer.details,
            "space_total": "O(n)" if analyzer.max_space_weight > 0 else "O(1)",
            "space_lines": analyzer.space_details,
            "is_recursive": is_recursive
        }
    except Exception as e:
        return {"status": "error", "total": "Error", "total_recurrence": "Error", "lines": [], "recurrence_lines": [], "is_recursive": False}

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