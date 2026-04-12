# api/analyzer.py
import ast
import re
from collections import deque

class ComplexityAnalyzer(ast.NodeVisitor):
    """
    A Context-Aware Rule-Based Traversal Algorithm.
    Evaluates time and space complexity line-by-line with dynamic, 
    comprehensive explanations for educational feedback.
    """

    def __init__(self, source_code):
        self.source_lines = source_code.splitlines()
        self.details = []                
        
        # Structural trackers
        self.current_depth = 0           
        self.loop_depth = 0              
        self.log_loop_depth = 0          
        self.sqrt_loop_depth = 0         
        
        # Peak complexity trackers
        self.max_complexity = 0          
        self.max_poly = 0                
        self.max_log = 0                 
        self.max_sqrt = 0                
        self.max_exp = 0                 # Tracks iterative exponential bottlenecks
        self.max_space_weight = 0        
        
        self.variable_complexities = {}  
        self.custom_functions = {}       
        self.custom_space = {}           
        self.current_function_name = None
        self.recursive_calls_count = 0   
        self.symbol_table = {}           
        self.reachable_funcs = set()     
        self.in_dead_code = False        
        
        self.has_recursion_in_loop = False  
        self.has_slicing = False            
        self.has_division = False           

        self.builtin_complexities = {
            'sort': {'time': 'O(n log n)', 'space': 'O(n)', 'desc': 'Timsort algorithm'},
            'sorted': {'time': 'O(n log n)', 'space': 'O(n)', 'desc': 'creates a sorted copy'},
            'join': {'time': 'O(n)', 'space': 'O(n)', 'desc': 'concatenates n elements'},
            'split': {'time': 'O(n)', 'space': 'O(n)', 'desc': 'scans string to create list'},
            'list': {'time': 'O(n)', 'space': 'O(n)', 'desc': 'iterates to build collection'},
            'append': {'time': 'O(1)', 'space': 'O(1)', 'desc': 'amortized constant time'},
            'pop': {'time': 'O(1)', 'space': 'O(1)', 'desc': 'removes last element'},
            'insert': {'time': 'O(n)', 'space': 'O(1)', 'desc': 'shifts subsequent elements'},
            'len': {'time': 'O(1)', 'space': 'O(1)', 'desc': 'constant time lookup'},
            'print': {'time': 'O(1)', 'space': 'O(1)', 'desc': 'standard output'}
        }
        self.aliases = {} 

    # --- PASS 1: CALL GRAPH & BFS ---
    def bfs_first_pass(self, tree):
        queue = deque([(tree, None)])
        self.call_graph = {'__main__': set()}
        self.reachable_funcs = set()
        
        while queue:
            current_node, current_func = queue.popleft()  
            if isinstance(current_node, ast.FunctionDef):
                self.symbol_table[current_node.name] = current_node  
                self.reachable_funcs.add(current_node.name) 
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
        
        reach_queue = deque(['__main__'])  
        reach_queue.extend(list(self.reachable_funcs)) 
        visited = set(['__main__']).union(self.reachable_funcs)
        
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
            rec_stack = set()
            if self._has_cycle(func, visited, rec_stack):
                self.custom_functions[func] = "O(2^n)"

    def _has_cycle(self, node, visited, rec_stack):
        if node in rec_stack: return True
        if node in visited: return False
        visited.add(node); rec_stack.add(node)
        for neighbor in self.call_graph.get(node, []):
            if self._has_cycle(neighbor, visited, rec_stack): return True
        rec_stack.remove(node); return False

    # --- DYNAMIC EXPLANATION GENERATOR ---
    def _generate_explanation(self, node, local_t, global_t, is_dead):
        """Creates detailed context-aware reasoning for each line."""
        if is_dead:
            return "This line is unreachable and will never execute (Dead Code)."
        
        # Looping logic
        if isinstance(node, ast.For):
            if "O(1)" in local_t:
                return "This loop runs for a fixed number of iterations, regardless of input size."
            if "O(2^n)" in local_t:
                return "Iterative exponential growth: The loop limit scales by 2^n (e.g., bit-shifting or power function)."
            return f"This loop iterates over a collection or range, contributing O(n) relative to its nesting level."
        
        if isinstance(node, ast.While):
            if "log n" in local_t:
                return "Logarithmic behavior: The loop state is divided or doubled in each step, reducing the work exponentially."
            if "√n" in local_t:
                return "Square root behavior: The loop condition is bound by i*i <= n."
            return "This loop continues until a dynamic condition is met."

        # Assignment and operations
        if isinstance(node, ast.Assign):
            if self.has_slicing:
                return "Slicing an array creates a copy, requiring O(n) time and space."
            if "O(n)" in local_t:
                return "This assignment involves a list comprehension or collection copy that scales with n."
            return "A simple assignment operation typically takes constant O(1) time."

        # Function Calls
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            f_id = node.func.id
            if f_id == self.current_function_name:
                return f"Recursive call: {f_id} invokes itself, creating a new stack frame."
            if f_id in self.builtin_complexities:
                return f"Built-in function '{f_id}': {self.builtin_complexities[f_id]['desc']}."

        return f"Standard operation contributing to {global_t} global complexity."

    # --- UTILITIES ---
    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]  
            return line.strip()  
        return "Code Block"  

    def get_color(self, complexity_str):
        if complexity_str == "-": return "#7f8c8d"  
        if "Dead Code" in complexity_str: return "#7f8c8d"  
        if "T(n) =" in complexity_str or "n!" in complexity_str or "T(n-1) + T" in complexity_str: return "#8e44ad"  
        if "2^n" in complexity_str or "2T(" in complexity_str: return "#9b59b6"  
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c"  
        if "log" in complexity_str: return "#2980b9"  
        if "√n" in complexity_str: return "#16a085"  
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22"  
        return "#27ae60"

    def _build_time_str(self, poly, log, sqrt=0, exp=0):
        if exp > 0: return "O(2^n)"  
        if poly <= 0 and log <= 0 and sqrt <= 0: return "O(1)"  
        parts = []
        if poly == 1: parts.append("n")
        elif poly > 1: parts.append(f"n^{poly}")  
        if sqrt == 1: parts.append("√n")
        elif sqrt > 1: parts.append(f"(√n)^{sqrt}")  
        if log == 1: parts.append("log n")
        elif log > 1: parts.append(f"log^{log} n")  
        return f"O({' '.join(parts)})" if parts else "O(1)"

    # --- HEURISTICS ---
    def _is_constant_loop(self, node):
        if isinstance(node, ast.While):
            if isinstance(node.test, ast.Compare):
                if isinstance(node.test.left, ast.Constant) or any(isinstance(c, ast.Constant) for c in node.test.comparators):
                    return True
        elif isinstance(node, ast.For):
            if isinstance(node.iter, ast.Call) and getattr(node.iter.func, 'id', '') == 'range':
                if all(isinstance(arg, ast.Constant) for arg in node.iter.args): return True
            elif isinstance(node.iter, (ast.List, ast.Tuple, ast.Set, ast.Constant)):
                return True
        return False

    def _is_log_loop(self, node):
        if not isinstance(node, ast.While): return False
        for child in ast.walk(node):  
            if isinstance(child, (ast.BinOp, ast.AugAssign)):
                op = child.op
                val = child.right if isinstance(child, ast.BinOp) else child.value
                if isinstance(op, (ast.Div, ast.FloorDiv, ast.RShift)) and isinstance(val, ast.Constant) and val.value in [1, 2]: return True
                if isinstance(op, (ast.Mult, ast.LShift)) and isinstance(val, ast.Constant) and val.value in [1, 2]: return True
        return False  
        
    def _is_sqrt_loop(self, node):
        if not isinstance(node, ast.While): return False  
        test = node.test  
        if isinstance(test, ast.Compare) and isinstance(test.left, ast.BinOp):  
            if isinstance(test.left.op, ast.Mult) and isinstance(test.left.left, ast.Name) and isinstance(test.left.right, ast.Name):
                if test.left.left.id == test.left.right.id: return True
            elif isinstance(test.left.op, ast.Pow) and isinstance(test.left.right, ast.Constant) and test.left.right.value == 2: return True
        return False
    
    def _is_exponential_loop(self, node):
        if not isinstance(node, (ast.For, ast.While)): return False
        expr = node.iter if isinstance(node, ast.For) else node.test
        for child in ast.walk(expr):
            if isinstance(child, ast.BinOp):
                if isinstance(child.op, ast.LShift): return True
                if isinstance(child.op, ast.Pow) and isinstance(child.left, ast.Constant) and child.left.value == 2: return True
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Name) and child.func.id == 'pow':
                if len(child.args) >= 2 and isinstance(child.args[0], ast.Constant) and child.args[0].value == 2: return True
            if isinstance(child, ast.Name) and self.variable_complexities.get(child.id) == "exponential": return True
        return False

    # --- RECORDING ENGINE ---
    def record_line(self, node, time_override=None, space_override=None):
        line_text = self.get_code_snippet(node)
        
        current_poly, current_log, current_sqrt = self.loop_depth, self.log_loop_depth, getattr(self, 'sqrt_loop_depth', 0)
        override_poly = override_log = override_sqrt = 0
        is_recurrence = False

        if time_override:
            if any(x in time_override for x in ["T(n) =", "n!", "2^n", "2T("]): is_recurrence = True
            else:
                if "n log n" in time_override: override_poly = 1; override_log = 1
                elif "O(log n)" in time_override: override_log = 1
                elif "O(√n)" in time_override: override_sqrt = 1
                elif "O(n)" in time_override: override_poly = 1

        total_poly, total_log, total_sqrt = current_poly + override_poly, current_log + override_log, current_sqrt + override_sqrt
        is_dead = getattr(self, 'in_dead_code', False) or time_override == "Dead Code"
        display_poly, display_log, display_sqrt = override_poly, override_log, override_sqrt
        
        if not time_override:
            if self._is_exponential_loop(node):
                time_override = "O(2^n)"
                is_recurrence = True
                self.max_exp = 1
            elif isinstance(node, ast.For): display_poly = 0 if self._is_constant_loop(node) else 1
            elif isinstance(node, ast.While):
                if self._is_constant_loop(node): display_poly = 0
                elif self._is_log_loop(node): display_log = 1
                elif self._is_sqrt_loop(node): display_sqrt = 1
                else: display_poly = 1

        if time_override == "Definition":
            local_t = global_t = local_s = global_s = "-"
            t_w = 0
        elif is_dead:
            local_t = global_t = local_s = global_s = "Dead Code"
            t_w = -1
        else:
            local_t = self._build_time_str(display_poly, display_log, display_sqrt)
            if time_override and is_recurrence:
                local_t = global_t = time_override
                t_w = 1000 
            else:
                if time_override: local_t = time_override
                global_t = self._build_time_str(total_poly, total_log, total_sqrt, self.max_exp)
                t_w = total_poly * 10 + total_sqrt * 7 + total_log * 5 + (100 if self.max_exp > 0 else 0)
            
            local_s = space_override if space_override else "O(1)"
            global_s = "O(n)" if self.recursive_calls_count > 0 else local_s

        explanation = self._generate_explanation(node, local_t, global_t, is_dead)

        entry = {
            "lineOfCode": line_text, "local_time": local_t, "global_time": global_t,
            "local_space": local_s, "global_space": global_s, "indent": self.current_depth,
            "color": self.get_color(global_t), "weight": t_w, 
            "local_explanation": explanation, 
            "global_explanation": f"In the current context, this line executes within a scope of {global_t}."
        }
        
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            if t_w > self.details[-1].get("weight", -1): self.details[-1].update(entry)
        else: self.details.append(entry)

        if not is_dead and time_override != "Definition":
            if t_w > self.max_complexity:
                self.max_complexity = t_w
                if t_w < 998: self.max_poly, self.max_log, self.max_sqrt = total_poly, total_log, total_sqrt

    def generic_visit(self, node):
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                hit_terminal = False  
                for item in value:
                    if isinstance(item, ast.AST):
                        if hit_terminal:
                            prev_dead = self.in_dead_code; self.in_dead_code = True  
                            self.visit(item); self.in_dead_code = prev_dead  
                        else:
                            self.visit(item)  
                            if isinstance(item, (ast.Return, ast.Break, ast.Continue)): hit_terminal = True
            elif isinstance(value, ast.AST): self.visit(value)

    # --- NODE HANDLERS ---
    def visit_FunctionDef(self, node):
        prev_data = (self.max_complexity, self.max_space_weight, self.max_poly, self.max_log, self.max_sqrt, self.max_exp)
        self.max_complexity = self.max_space_weight = self.max_poly = self.max_log = self.max_sqrt = self.max_exp = 0
        self.current_function_name, self.recursive_calls_count = node.name, 0
        self.has_recursion_in_loop = self.has_slicing = self.has_division = False
        is_dead = node.name not in self.reachable_funcs
        self.record_line(node, time_override="Dead Code" if is_dead else "Definition")
        prev_dead = self.in_dead_code; self.in_dead_code = is_dead or prev_dead
        self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1
        self.in_dead_code = prev_dead
        
        if self.has_recursion_in_loop: relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2: relation = "T(n) = 2T(n/2) + O(n)" if (self.has_slicing or self.has_division or self.max_poly > 0) else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            if self.has_division: relation = "T(n) = T(n/2) + O(n)" if self.max_poly > 0 else "T(n) = T(n/2) + O(1)"
            else: relation = "T(n) = T(n-1) + O(n)" if (self.max_poly > 0 or self.has_slicing) else "T(n) = T(n-1) + O(1)"
        else: 
            relation = "O(2^n)" if self.max_exp > 0 else self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
            
        self.custom_functions[node.name] = relation
        self.custom_space[node.name] = "O(log n)" if (self.recursive_calls_count == 1 and self.has_division) else ("O(n)" if (self.recursive_calls_count > 0 or self.max_space_weight > 0) else "O(1)")
        if not is_dead:
            self.max_exp = max(prev_data[5], self.max_exp)
            self.max_complexity, self.max_space_weight = max(prev_data[0], self.max_complexity), max(prev_data[1], self.max_space_weight)
            self.max_poly, self.max_log, self.max_sqrt = max(prev_data[2], self.max_poly), max(prev_data[3], self.max_log), max(prev_data[4], self.max_sqrt)
        else: self.max_complexity, self.max_space_weight, self.max_poly, self.max_log, self.max_sqrt, self.max_exp = prev_data
        self.current_function_name = None

    def visit_If(self, node):
        self.record_line(node)
        prev_rec = self.recursive_calls_count; self.recursive_calls_count = 0
        self.current_depth += 1; [self.visit(c) for c in node.body]; self.current_depth -= 1
        if_rec = self.recursive_calls_count; self.recursive_calls_count = 0
        self.current_depth += 1; [self.visit(c) for c in node.orelse]; self.current_depth -= 1
        self.recursive_calls_count = prev_rec + max(if_rec, self.recursive_calls_count)

    def visit_For(self, node):
        if self._is_exponential_loop(node):
            self.max_exp = 1
            self.record_line(node, time_override="O(2^n)")
            self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1
            return 
        is_const = self._is_constant_loop(node)
        if not is_const: self.loop_depth += 1
        self.record_line(node); self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1  
        if not is_const: self.loop_depth -= 1

    def visit_While(self, node):
        is_log, is_sqrt, is_const = self._is_log_loop(node), self._is_sqrt_loop(node), self._is_constant_loop(node)
        if not is_const:
            if is_log: self.log_loop_depth += 1
            elif is_sqrt: self.sqrt_loop_depth += 1
            else: self.loop_depth += 1
        self.record_line(node); self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1  
        if not is_const:
            if is_log: self.log_loop_depth -= 1
            elif is_sqrt: self.sqrt_loop_depth -= 1
            else: self.loop_depth -= 1

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            f_id = self.aliases.get(node.func.id, node.func.id)
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0 or self.log_loop_depth > 0: self.has_recursion_in_loop = True  
                self.record_line(node, time_override=self.custom_functions.get(f_id, "T(n-1)"), space_override="O(n)")
            elif f_id in self.builtin_complexities:
                b = self.builtin_complexities[f_id]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            elif f_id in self.custom_functions:
                call_comp = self.custom_functions[f_id]
                lookup = {"T(n) = n * T(n-1)": "O(n!)", "2T(n/2)": "O(n log n)", "T(n-1) + T(n-2)": "O(2^n)", "T(n/2) + O(1)": "O(log n)", "T(n-1) + O(n)": "O(n^2)"}
                for k, v in lookup.items():
                    if k in call_comp: call_comp = v; break
                self.record_line(node, time_override=call_comp, space_override=self.custom_space.get(f_id, "O(1)"))
            else: self.record_line(node)
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.builtin_complexities:
                b = self.builtin_complexities[node.func.attr]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            else: self.record_line(node)
        self.generic_visit(node)

    def visit_Assign(self, node):
        s_ov, t_ov = "O(1)", None
        for child in ast.walk(node.value):
            if isinstance(child, (ast.BinOp, ast.Call)):
                if (isinstance(child, ast.BinOp) and (isinstance(child.op, ast.LShift) or (isinstance(child.op, ast.Pow) and getattr(child.left, 'value', 0) == 2))) or (isinstance(child, ast.Call) and getattr(child.func, 'id', '') == 'pow' and getattr(child.args[0], 'value', 0) == 2):
                    for target in node.targets:
                        if isinstance(target, ast.Name): self.variable_complexities[target.id] = "exponential"
        if isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice): self.has_slicing = True
        self.record_line(node, time_override=t_ov, space_override=s_ov); self.generic_visit(node)

    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice): self.has_slicing = True  
        self.generic_visit(node)  

    def visit_BinOp(self, node):
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)): self.has_division = True  
        self.generic_visit(node)  

    def visit_AugAssign(self, node): self.record_line(node); self.generic_visit(node)  
    def visit_Return(self, node): self.record_line(node); self.generic_visit(node)  
    def visit_Expr(self, node): self.record_line(node); self.generic_visit(node)      

    # --- BADGES ---
    def get_final_badge(self):
        for line in reversed(self.details):   
            comp = line.get('global_time', '')  
            if "T(n) =" in comp or comp in ["O(n!)", "O(2^n)", "O(n log n)"]: return comp
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt, self.max_exp)

    def get_final_asymptotic_badge(self):
        for line in reversed(self.details):  
            comp = line.get('global_time', '')
            lookup = {"T(n) = n * T(n-1)": "O(n!)", "O(n!)": "O(n!)", "2T(n/2)": "O(n log n)", "T(n-1) + T(n-2)": "O(2^n)", "T(n/2) + O(1)": "O(log n)", "T(n-1) + O(n)": "O(n^2)"}
            for k, v in lookup.items():
                if k in comp: return v
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt, self.max_exp)