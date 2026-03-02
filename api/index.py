from fastapi import FastAPI, HTTPException
import sys
import os
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import re

# --- VERCEL IMPORT FIX ---
# This explicitly tells Python to look inside the /api directory for your custom modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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
        self.log_loop_depth = 0
        self.max_complexity = 0 
        self.max_poly = 0
        self.max_log = 0
        self.max_space_weight = 0   
        self.custom_functions = {} 
        self.custom_space = {}      
        self.current_function_name = None  
        self.recursive_calls_count = 0
        self.symbol_table = {}
        
        self.has_recursion_in_loop = False
        self.has_slicing = False
        self.has_division = False

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

    def _is_log_loop(self, node):
        if not isinstance(node, ast.While):
            return False
        for child in ast.walk(node):
            if isinstance(child, ast.BinOp):
                # Standard division: x / 2 or x // 2
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.right, ast.Constant) and child.right.value == 2:
                    return True
                # Bitwise right shift: x >> 1 (equivalent to floor division by 2)
                if isinstance(child.op, ast.RShift) and isinstance(child.right, ast.Constant) and child.right.value == 1:
                    return True
            elif isinstance(child, ast.AugAssign):
                # Aug assignments: x /= 2, x //= 2
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.value, ast.Constant) and child.value.value == 2:
                    return True
                # Aug assignments: x >>= 1
                if isinstance(child.op, ast.RShift) and isinstance(child.value, ast.Constant) and child.value.value == 1:
                    return True
        return False

    def _build_time_str(self, poly, log):
        if poly == 0 and log == 0: return "O(1)"
        if poly == 0 and log == 1: return "O(log n)"
        if poly == 0 and log > 1: return f"O(log^{log} n)"
        if poly == 1 and log == 0: return "O(n)"
        if poly == 1 and log == 1: return "O(n log n)"
        if poly == 1 and log > 1: return f"O(n log^{log} n)"
        if poly > 1 and log == 0: return f"O(n^{poly})"
        if poly > 1 and log == 1: return f"O(n^{poly} log n)"
        return f"O(n^{poly} log^{log} n)"

    def record_line(self, node, time_override=None, space_override=None):
        line_text = self.get_code_snippet(node)

        # 1. Base depth of loops
        current_poly = self.loop_depth
        current_log = self.log_loop_depth
        
        # 2. Add complexity from function calls/overrides
        override_poly = 0
        override_log = 0
        is_recurrence = False

        if time_override:
            if any(x in time_override for x in ["T(n) =", "n!", "2^n", "2T("]):
                is_recurrence = True
            else:
                if "n log n" in time_override:
                    override_poly = 1
                    override_log = 1
                elif "O(log n)" in time_override:
                    override_log = 1
                elif "O(n)" in time_override:
                    override_poly = 1
                else:
                    match = re.search(r"O\(n\^(\d+)", time_override)
                    if match:
                        override_poly = int(match.group(1))
                        override_log = 1 if "log n" in time_override else 0

        # Combine loop depth and function overrides for the internal weight
        total_poly = current_poly + override_poly
        total_log = current_log + override_log
        
        local_weight = 0

        if time_override and is_recurrence:
            time_str = time_override
            t_weight = 1000
            local_weight = 1000
        else:
            display_poly = override_poly
            display_log = override_log
            
            # If it's a loop declaration itself, show its local O(n) or O(log n)
            if not time_override:
                if isinstance(node, ast.For):
                    display_poly = 1
                elif isinstance(node, ast.While):
                    if self._is_log_loop(node):
                        display_log = 1
                    else:
                        display_poly = 1

            time_str = self._build_time_str(display_poly, display_log)
            t_weight = total_poly * 10 + total_log * 5
            
            # FIX: Calculate a local weight purely based on the display string
            local_weight = display_poly * 10 + display_log * 5

        space_str = space_override if space_override else "O(1)"
        s_weight = 10 if "O(n)" in space_str else 0
        if "n!" in space_str or "T(n-1) + T" in space_str: s_weight = 1000

        # GROUPING mechanism: ONLY overwrite if the new operation is STRICTLY heavier overall
        # OR if it has the same total weight but a heavier local display complexity.
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            existing_t_weight = self.details[-1].get("weight", -1)
            existing_local_weight = self.details[-1].get("local_weight", -1)
            
            if t_weight > existing_t_weight or (t_weight == existing_t_weight and local_weight > existing_local_weight):
                self.details[-1]["complexity"] = time_str
                self.details[-1]["color"] = self.get_color(time_str)
                self.details[-1]["weight"] = t_weight
                self.details[-1]["local_weight"] = local_weight
        else:
            self.details.append({
                "lineOfCode": line_text, 
                "complexity": time_str, 
                "indent": self.current_depth, 
                "color": self.get_color(time_str), 
                "weight": t_weight,
                "local_weight": local_weight
            })

        if self.space_details and self.space_details[-1]["lineOfCode"] == line_text:
            existing_s_weight = self.space_details[-1].get("weight", -1)
            if s_weight > existing_s_weight: # FIX: Changed from >= to >
                self.space_details[-1]["complexity"] = space_str
                self.space_details[-1]["color"] = self.get_color(space_str)
                self.space_details[-1]["weight"] = s_weight
        else:
            self.space_details.append({
                "lineOfCode": line_text, 
                "complexity": space_str, 
                "indent": self.current_depth, 
                "color": self.get_color(space_str), 
                "weight": s_weight
            })

        # Track max depth dynamically
        if t_weight > self.max_complexity: 
            self.max_complexity = t_weight
            if t_weight < 998:
                self.max_poly = t_weight // 10
                self.max_log = (t_weight % 10) // 5
            
        if s_weight > self.max_space_weight: 
            self.max_space_weight = s_weight

    def visit_FunctionDef(self, node):
        self.current_function_name = node.name 
        self.recursive_calls_count = 0 
        self.has_recursion_in_loop = False 
        self.has_slicing = False           
        self.has_division = False
        
        self.record_line(node, time_override="O(1)", space_override="O(1)") 
        
        prev_t, prev_s = self.max_complexity, self.max_space_weight
        prev_poly, prev_log = self.max_poly, self.max_log
        self.max_complexity, self.max_space_weight = 0, 0
        self.max_poly, self.max_log = 0, 0
        
        self.current_depth += 1 
        self.generic_visit(node)
        self.current_depth -= 1
        
        if self.has_recursion_in_loop:
            relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2:
            relation = "T(n) = 2T(n/2) + O(n)" if (self.has_slicing or self.has_division) else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            relation = "T(n) = T(n-1) + O(1)"
        else:
            relation = self._build_time_str(self.max_poly, self.max_log)
            
        self.custom_functions[node.name] = relation
        self.custom_space[node.name] = "O(n)" if (self.recursive_calls_count > 0 or self.max_space_weight > 0) else "O(1)"
        
        self.max_complexity = max(prev_t, self.max_complexity)
        self.max_space_weight = max(prev_s, self.max_space_weight)
        self.max_poly = max(prev_poly, self.max_poly)
        self.max_log = max(prev_log, self.max_log)
        self.current_function_name = None

    def visit_For(self, node):
        self.loop_depth += 1      
        self.record_line(node)    # FIX: Removed outdated arguments
        self.current_depth += 1   
        self.generic_visit(node)  
        self.current_depth -= 1   
        self.loop_depth -= 1      

    def visit_While(self, node):
        is_log = self._is_log_loop(node)
        if is_log:
            self.log_loop_depth += 1
        else:
            self.loop_depth += 1      
            
        self.record_line(node)   # FIX: Removed outdated arguments
        
        self.current_depth += 1   
        self.generic_visit(node)
        self.current_depth -= 1
        
        if is_log:
            self.log_loop_depth -= 1
        else:
            self.loop_depth -= 1
            
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            f_id = node.func.id
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0 or self.log_loop_depth > 0: self.has_recursion_in_loop = True
                
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

    def visit_BinOp(self, node):
        # Treat Division, Floor Division, and Right Shift (>>) as "division" operations 
        # so the analyzer knows when lists are being split in half.
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)):
            self.has_division = True
            
        self.generic_visit(node)

    def visit_Assign(self, node): 
        space_override = None
        if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
            if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                space_override = "O(n)"
        elif isinstance(node.value, ast.ListComp):
            space_override = "O(n)"
        elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
            space_override = "O(n)"
            
        self.record_line(node, space_override=space_override)
        self.generic_visit(node)

    def visit_AugAssign(self, node): 
        self.record_line(node)
        self.generic_visit(node)

    def visit_Return(self, node): 
        space_override = None
        if node.value:
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                    space_override = "O(n)"
            elif isinstance(node.value, ast.ListComp):
                space_override = "O(n)"
            elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
                space_override = "O(n)"
        self.record_line(node, space_override=space_override)
        self.generic_visit(node)

    def visit_Expr(self, node): 
        self.record_line(node)
        self.generic_visit(node)

    def get_final_badge(self):
        for line in reversed(self.details):
            if "T(n) =" in line.get('complexity', ''): return line['complexity']
        return self._build_time_str(self.max_poly, self.max_log)

    def get_final_asymptotic_badge(self):
        for line in reversed(self.details):
            comp = line.get('complexity', '')
            if "T(n) = n * T(n-1)" in comp: return "O(n!)"
            elif "2T(n/2)" in comp: return "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp: return "O(2^n)"
            elif "T(n-1)" in comp: return "O(n)"
        return self._build_time_str(self.max_poly, self.max_log)

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
        analyzer.max_poly, analyzer.max_log = 0, 0
        analyzer.current_depth, analyzer.loop_depth, analyzer.log_loop_depth = 0, 0, 0
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