from fastapi import FastAPI, HTTPException
import sys
import os
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import re

# --- VERCEL IMPORT FIX ---
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
        self.sqrt_loop_depth = 0
        self.max_complexity = 0
        self.max_poly = 0
        self.max_log = 0
        self.max_sqrt = 0
        self.max_space_weight = 0
        self.custom_functions = {}
        self.custom_space = {}
        self.current_function_name = None
        self.recursive_calls_count = 0
        self.symbol_table = {}
        
        # Dead Code State Flags
        self.reachable_funcs = set()
        self.in_dead_code = False
        
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
        self.aliases = {} # NEW: Tracks function aliasing

    def bfs_first_pass(self, tree):
        queue = deque([(tree, None)]) 
        self.call_graph = {'__main__': set()}
        
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
                else:
                    self.call_graph['__main__'].add(called_func)

            for child in ast.iter_child_nodes(current_node):
                queue.append((child, current_func))
                
        # DEAD CODE DETECTION: Map all reachable nodes starting from main execution block
        self.reachable_funcs = set()
        reach_queue = deque(['__main__'])
        visited = set(['__main__'])
        
        while reach_queue:
            curr = reach_queue.popleft()
            for neighbor in self.call_graph.get(curr, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    self.reachable_funcs.add(neighbor)
                    reach_queue.append(neighbor)
                
        for func_name, called_funcs in self.call_graph.items():
            if func_name in called_funcs:
                self.custom_functions[func_name] = "T(n)"

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
        if "Dead Code" in complexity_str: return "#7f8c8d" # Grey visual indicator in UI
        if "T(n) =" in complexity_str or "n!" in complexity_str or "T(n-1) + T" in complexity_str: return "#8e44ad" 
        if "2^n" in complexity_str or "2T(" in complexity_str: return "#9b59b6" 
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c" 
        if "log" in complexity_str: return "#2980b9" 
        if "√n" in complexity_str: return "#16a085" 
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22" 
        return "#27ae60" 

    def _build_time_str(self, poly, log, sqrt=0):
        if poly == 0 and log == 0 and sqrt == 0: return "O(1)"
        
        parts = []
        if poly == 1: parts.append("n")
        elif poly > 1: parts.append(f"n^{poly}")
        
        if sqrt == 1: parts.append("√n")
        elif sqrt > 1: parts.append(f"(√n)^{sqrt}")
        
        if log == 1: parts.append("log n")
        elif log > 1: parts.append(f"log^{log} n")
        
        if not parts: return "O(1)"
        return f"O({' '.join(parts)})"

    def _is_log_loop(self, node):
        if not isinstance(node, ast.While):
            return False
        for child in ast.walk(node):
            if isinstance(child, ast.BinOp):
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.right, ast.Constant) and child.right.value == 2:
                    return True
                if isinstance(child.op, ast.RShift) and isinstance(child.right, ast.Constant) and child.right.value == 1:
                    return True
            elif isinstance(child, ast.AugAssign):
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.value, ast.Constant) and child.value.value == 2:
                    return True
                if isinstance(child.op, ast.RShift) and isinstance(child.value, ast.Constant) and child.value.value == 1:
                    return True
        return False
        
    def _is_sqrt_loop(self, node):
        if not isinstance(node, ast.While):
            return False
        test = node.test
        if isinstance(test, ast.Compare):
            if isinstance(test.left, ast.BinOp):
                if isinstance(test.left.op, ast.Mult):
                    if isinstance(test.left.left, ast.Name) and isinstance(test.left.right, ast.Name):
                        if test.left.left.id == test.left.right.id:
                            return True
                elif isinstance(test.left.op, ast.Pow):
                    if isinstance(test.left.right, ast.Constant) and test.left.right.value == 2:
                        return True
        return False

    def record_line(self, node, time_override=None, space_override=None):
        line_text = self.get_code_snippet(node)

        current_poly = self.loop_depth
        current_log = self.log_loop_depth
        current_sqrt = getattr(self, 'sqrt_loop_depth', 0)
        
        override_poly = 0
        override_log = 0
        override_sqrt = 0
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
                elif "O(√n)" in time_override:
                    override_sqrt = 1
                elif "O(n)" in time_override:
                    override_poly = 1
                else:
                    match = re.search(r"O\(n\^(\d+)", time_override)
                    if match:
                        override_poly = int(match.group(1))
                        override_log = 1 if "log n" in time_override else 0

        total_poly = current_poly + override_poly
        total_log = current_log + override_log
        total_sqrt = current_sqrt + override_sqrt
        
        # Dead Code check: Safely ignore them so they don't skew the complexity overall badge
        is_dead = getattr(self, 'in_dead_code', False) or time_override == "Dead Code"

        if time_override and is_recurrence and not is_dead:
            time_str = time_override
            t_weight = 1000
            local_weight = 1000
        elif is_dead:
            time_str = "Dead Code"
            t_weight = -1
            local_weight = -1
        else:
            display_poly = override_poly
            display_log = override_log
            display_sqrt = override_sqrt
            
            if not time_override:
                if isinstance(node, ast.For):
                    display_poly = 1
                elif isinstance(node, ast.While):
                    if self._is_log_loop(node):
                        display_log = 1
                    elif self._is_sqrt_loop(node):
                        display_sqrt = 1
                    else:
                        display_poly = 1

            time_str = self._build_time_str(display_poly, display_log, display_sqrt)
            t_weight = total_poly * 10 + total_sqrt * 7 + total_log * 5
            local_weight = display_poly * 10 + display_sqrt * 7 + display_log * 5

        space_str = space_override if space_override else "O(1)"
        s_weight = 10 if "O(n)" in space_str else 0
        if "n!" in space_str or "T(n-1) + T" in space_str: s_weight = 1000
        
        if is_dead or space_override == "Dead Code":
            space_str = "Dead Code"
            s_weight = -1

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
            if s_weight > existing_s_weight:
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

        if not is_dead:
            if t_weight > self.max_complexity: 
                self.max_complexity = t_weight
                if t_weight < 998:
                    self.max_poly = total_poly
                    self.max_log = total_log
                    self.max_sqrt = total_sqrt
                
            if s_weight > self.max_space_weight: 
                self.max_space_weight = s_weight

    def generic_visit(self, node):
        """ DEAD CODE DETECTION: Intercepts unreachable statements after returns/breaks """
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                hit_terminal = False
                for item in value:
                    if isinstance(item, ast.AST):
                        if hit_terminal:
                            prev_dead = getattr(self, 'in_dead_code', False)
                            self.in_dead_code = True
                            self.visit(item)
                            self.in_dead_code = prev_dead
                        else:
                            self.visit(item)
                            if isinstance(item, (ast.Return, ast.Break, ast.Continue)):
                                hit_terminal = True
            elif isinstance(value, ast.AST):
                self.visit(value)

    def visit_FunctionDef(self, node):
        self.current_function_name = node.name
        self.recursive_calls_count = 0
        self.has_recursion_in_loop = False
        self.has_slicing = False
        self.has_division = False
        
        is_dead = node.name not in self.reachable_funcs
        time_override = "Dead Code" if is_dead else "O(1)"
        space_override = "Dead Code" if is_dead else "O(1)"
        
        self.record_line(node, time_override=time_override, space_override=space_override) 
        
        prev_t, prev_s = self.max_complexity, self.max_space_weight
        prev_poly, prev_log = self.max_poly, self.max_log
        prev_sqrt = getattr(self, 'max_sqrt', 0)
        
        self.max_complexity, self.max_space_weight = 0, 0
        self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0
        
        prev_dead = getattr(self, 'in_dead_code', False)
        self.in_dead_code = is_dead or prev_dead
        
        self.current_depth += 1 
        self.generic_visit(node)
        self.current_depth -= 1
        
        self.in_dead_code = prev_dead
        
        if self.has_recursion_in_loop:
            relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2:
            relation = "T(n) = 2T(n/2) + O(n)" if (self.has_slicing or self.has_division) else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            relation = "T(n) = T(n-1) + O(1)"
        else:
            relation = self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
            
        self.custom_functions[node.name] = relation
        
        # Edge Case: Logarithmic Space for Divide-and-Conquer
        if self.recursive_calls_count > 0:
            if self.has_division and not self.has_slicing and self.recursive_calls_count == 1:
                self.custom_space[node.name] = "O(log n)" # e.g. Recursive Binary Search
            else:
                self.custom_space[node.name] = "O(n)" # Standard Recursion Stack or Slicing
        elif self.max_space_weight > 0:
            self.custom_space[node.name] = "O(n)"
        else:
            self.custom_space[node.name] = "O(1)"

        if not is_dead:
            self.max_complexity = max(prev_t, self.max_complexity)
            self.max_space_weight = max(prev_s, self.max_space_weight)
            self.max_poly = max(prev_poly, self.max_poly)
            self.max_log = max(prev_log, self.max_log)
            self.max_sqrt = max(prev_sqrt, getattr(self, 'max_sqrt', 0))
        else:
            self.max_complexity = prev_t
            self.max_space_weight = prev_s
            self.max_poly = prev_poly
            self.max_log = prev_log
            self.max_sqrt = prev_sqrt
            
        self.current_function_name = None

    def visit_If(self, node):
        """ CFG CONSTRUCTION: Worst-Case Path Selection """
        self.record_line(node)
        
        prev_max_comp = self.max_complexity
        prev_max_poly = self.max_poly
        prev_max_log = self.max_log
        prev_max_sqrt = getattr(self, 'max_sqrt', 0)
        
        # Analyze IF branch independently
        self.max_complexity, self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0, 0
        self.current_depth += 1
        for child in node.body:
            self.visit(child)
        self.current_depth -= 1
        if_comp, if_poly, if_log, if_sqrt = self.max_complexity, self.max_poly, self.max_log, self.max_sqrt
        
        # Analyze ELSE branch independently
        self.max_complexity, self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0, 0
        self.current_depth += 1
        for child in node.orelse:
            self.visit(child)
        self.current_depth -= 1
        else_comp, else_poly, else_log, else_sqrt = self.max_complexity, self.max_poly, self.max_log, self.max_sqrt
        
        # Systematically select maximum weight to display true asymptotic worst-case
        if if_comp >= else_comp:
            self.max_complexity = max(prev_max_comp, if_comp)
            self.max_poly = max(prev_max_poly, if_poly)
            self.max_log = max(prev_max_log, if_log)
            self.max_sqrt = max(prev_max_sqrt, if_sqrt)
        else:
            self.max_complexity = max(prev_max_comp, else_comp)
            self.max_poly = max(prev_max_poly, else_poly)
            self.max_log = max(prev_max_log, else_log)
            self.max_sqrt = max(prev_max_sqrt, else_sqrt)

    def visit_For(self, node):
        self.loop_depth += 1
        self.record_line(node)
        self.current_depth += 1
        self.generic_visit(node)
        self.current_depth -= 1
        self.loop_depth -= 1

    def visit_While(self, node):
        is_log = self._is_log_loop(node)
        is_sqrt = self._is_sqrt_loop(node)
        
        if is_log:
            self.log_loop_depth += 1
        elif is_sqrt:
            self.sqrt_loop_depth += 1
        else:
            self.loop_depth += 1
            
        self.record_line(node)
        
        self.current_depth += 1
        self.generic_visit(node)
        self.current_depth -= 1
        
        if is_log:
            self.log_loop_depth -= 1
        elif is_sqrt:
            self.sqrt_loop_depth -= 1
        else:
            self.loop_depth -= 1

    def visit_Call(self, node):
        # Edge Case: Built-in Method Chaining (e.g., list.copy().sort())
        chain_time, chain_space = None, None
        chain_poly = 0
        
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
                attr = child.func.attr
                if attr in self.builtin_complexities:
                    b = self.builtin_complexities[attr]
                    if "n log n" in b['time']: chain_poly = max(chain_poly, 2)
                    elif "n" in b['time']: chain_poly = max(chain_poly, 1)
                    if "O(n)" in b['space']: chain_space = "O(n)"
        
        if chain_poly == 2: chain_time = "O(n log n)"
        elif chain_poly == 1: chain_time = "O(n)"

        if isinstance(node.func, ast.Name):
            # Resolve Alias if exists
            f_id = self.aliases.get(node.func.id, node.func.id)
            
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0 or self.log_loop_depth > 0: self.has_recursion_in_loop = True
                
                rel = self.custom_functions.get(f_id, "T(n-1)")
                self.record_line(node, time_override=rel, space_override="O(n)")
                
            elif f_id in self.builtin_complexities:
                b = self.builtin_complexities[f_id]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            elif f_id in self.custom_functions:
                call_comp = self.custom_functions[f_id]
                if "T(n) = n * T(n-1)" in call_comp: call_comp = "O(n!)"
                elif "2T(n/2)" in call_comp: call_comp = "O(n log n)"
                elif "T(n-1) + T(n-2)" in call_comp: call_comp = "O(2^n)"
                elif "T(n-1)" in call_comp: call_comp = "O(n)"
                
                self.record_line(node, time_override=call_comp, space_override=self.custom_space.get(f_id, "O(1)"))
            else:
                self.record_line(node)
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.builtin_complexities:
                t = chain_time if chain_time else self.builtin_complexities[node.func.attr]['time']
                s = chain_space if chain_space else self.builtin_complexities[node.func.attr]['space']
                self.record_line(node, time_override=t, space_override=s)
            else:
                self.record_line(node, time_override=chain_time, space_override=chain_space)
                
        self.generic_visit(node)

    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice): self.has_slicing = True
        self.generic_visit(node)

    def visit_BinOp(self, node):
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)):
            self.has_division = True
        self.generic_visit(node)

    def visit_Assign(self, node): 
        space_override = "O(1)"
        time_override = None

        # Edge Case: Function Aliasing (e.g., my_func = fibonacci)
        if isinstance(node.value, ast.Name):
            if node.value.id in self.custom_functions:
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self.aliases[target.id] = node.value.id

        if node.value:
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                    space_override = "O(n)"
            elif isinstance(node.value, ast.ListComp):
                # Edge Case: Nested List Comprehensions
                gen_count = len(node.value.generators)
                if gen_count > 1:
                    space_override = f"O(n^{gen_count})"
                    time_override = f"O(n^{gen_count})"
                else:
                    space_override = "O(n)"
                    time_override = "O(n)"
            elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
                space_override = "O(n)"
                time_override = "O(n)" # Slicing is an O(n) operation
            elif isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute) and node.value.func.attr == 'copy':
                space_override = "O(n)"
            
        self.record_line(node, time_override=time_override, space_override=space_override)
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        self.record_line(node)
        self.generic_visit(node)
    
    def visit_Return(self, node):
        space_override = "O(1)"
        time_override = None
        if node.value:
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                    space_override = "O(n)"
            elif isinstance(node.value, ast.ListComp):
                gen_count = len(node.value.generators)
                if gen_count > 1:
                    space_override = f"O(n^{gen_count})"
                    time_override = f"O(n^{gen_count})"
                else:
                    space_override = "O(n)"
                    time_override = "O(n)"
            elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
                space_override = "O(n)"
                time_override = "O(n)"
                
        self.record_line(node, time_override=time_override, space_override=space_override)
        self.generic_visit(node)
    
    def visit_Expr(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def get_final_badge(self):
        for line in reversed(self.details):
            comp = line.get('complexity', '')
            # Catch raw recurrences OR our new evaluated closed-form external calls
            if "T(n) =" in comp: return comp
            if comp in ["O(n!)", "O(2^n)", "O(n log n)"]: return comp
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)

    def get_final_asymptotic_badge(self):
        for line in reversed(self.details):
            comp = line.get('complexity', '')
            # Map both the raw recurrence and the closed-form string to the final badge
            if "T(n) = n * T(n-1)" in comp or comp == "O(n!)": return "O(n!)"
            elif "2T(n/2)" in comp or comp == "O(n log n)": return "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp or comp == "O(2^n)": return "O(2^n)"
            elif "T(n-1)" in comp: return "O(n)"
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
    
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
        analyzer.max_poly, analyzer.max_log, analyzer.max_sqrt = 0, 0, 0
        analyzer.current_depth, analyzer.loop_depth, analyzer.log_loop_depth, analyzer.sqrt_loop_depth = 0, 0, 0, 0
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
                "color": line.get("color", analyzer.get_color(asymp)),
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