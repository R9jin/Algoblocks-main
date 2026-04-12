# api/analyzer.py
import ast
import re
from collections import deque

class ComplexityAnalyzer(ast.NodeVisitor):
    """
    A context-aware, multi-pass rule-based Abstract Syntax Tree (AST) visitor.
    It evaluates the time and space complexity of Python code line-by-line,
    accounting for nested loops, conditional branches, recursion, and built-in functions.
    """

    def __init__(self, source_code):
        # Store original source for line-by-line code snippet extraction
        self.source_lines = source_code.splitlines()
        
        # Details list stores analysis metadata for every processed line of code
        self.details = []                
        
        # State trackers for current structural and visual depth
        self.current_depth = 0           # For UI indentation
        self.loop_depth = 0              # Standard polynomial nesting (O(n), O(n^2))
        self.log_loop_depth = 0          # Logarithmic nesting (O(log n))
        self.sqrt_loop_depth = 0         # Square root nesting (O(√n))
        
        # Global maximum trackers to determine the final program complexity badge
        self.max_complexity = 0          # Combined numeric weight of the bottleneck
        self.max_poly = 0                # Peak polynomial degree
        self.max_log = 0                 # Peak logarithmic degree
        self.max_sqrt = 0                # Peak square root degree
        self.max_space_weight = 0        # Peak auxiliary space complexity
        
        # Function analysis and Call Graph states
        self.custom_functions = {}       # Maps function names to their time relation (e.g., "T(n-1)")
        self.custom_space = {}           # Maps function names to their space relation
        self.current_function_name = None
        self.recursive_calls_count = 0   # Counters for identifying recurrence types
        self.symbol_table = {}           # Stores references to parsed function definitions
        self.reachable_funcs = set()     # Set of functions actually invoked (for Dead Code Elimination)
        self.in_dead_code = False        # Flag to prevent analysis of unreachable code paths
        
        # Recurrence relation triggers
        self.has_recursion_in_loop = False  
        self.has_slicing = False            
        self.has_division = False           

        # Hardcoded complexities for common Python built-ins
        self.builtin_complexities = {
            'sort': {'time': 'O(n log n)', 'space': 'O(n)'},
            'sorted': {'time': 'O(n log n)', 'space': 'O(n)'},
            'join': {'time': 'O(n)', 'space': 'O(n)'},
            'split': {'time': 'O(n)', 'space': 'O(n)'},
            'list': {'time': 'O(n)', 'space': 'O(n)'},
            'set': {'time': 'O(n)', 'space': 'O(n)'},
            'dict': {'time': 'O(n)', 'space': 'O(n)'},
            'tuple': {'time': 'O(n)', 'space': 'O(n)'},
            'map': {'time': 'O(1)', 'space': 'O(1)'}, 
            'filter': {'time': 'O(1)', 'space': 'O(1)'},
            'index': {'time': 'O(n)', 'space': 'O(1)'},
            'append': {'time': 'O(1)', 'space': 'O(1)'},
            'pop': {'time': 'O(1)', 'space': 'O(1)'},     # Default O(1), dynamically adjusted in visit_Call
            'insert': {'time': 'O(n)', 'space': 'O(1)'},  
            'remove': {'time': 'O(n)', 'space': 'O(1)'},  
            'count': {'time': 'O(n)', 'space': 'O(1)'},
            'copy': {'time': 'O(n)', 'space': 'O(n)'},
            'str': {'time': 'O(n)', 'space': 'O(n)'},
            'max': {'time': 'O(n)', 'space': 'O(1)'},
            'min': {'time': 'O(n)', 'space': 'O(1)'},
            'sum': {'time': 'O(n)', 'space': 'O(1)'},
            'input': {'time': 'O(n)', 'space': 'O(n)'},
            'print': {'time': 'O(1)', 'space': 'O(1)'},   # Default O(1), dynamically adjusted in visit_Call
            'readline': {'time': 'O(n)', 'space': 'O(n)'},
            'read': {'time': 'O(n)', 'space': 'O(n)'},
            'len': {'time': 'O(1)', 'space': 'O(1)'},
            'range': {'time': 'O(1)', 'space': 'O(1)'},
            'int': {'time': 'O(1)', 'space': 'O(1)'},
            'float': {'time': 'O(1)', 'space': 'O(1)'},
            'abs': {'time': 'O(1)', 'space': 'O(1)'},
            'enumerate': {'time': 'O(1)', 'space': 'O(1)'},
            'zip': {'time': 'O(1)', 'space': 'O(1)'},
            'reversed': {'time': 'O(1)', 'space': 'O(1)'},
            'sqrt': {'time': 'O(1)', 'space': 'O(1)'}
        }
        self.aliases = {} # Tracks variable aliases to functions (e.g. f = my_recursive_func)

    # -------------------------------------------------------------------------
    # PASS 1: CALL GRAPH & RECURSION DETECTION
    # -------------------------------------------------------------------------
    def bfs_first_pass(self, tree):
        """
        Builds a call graph before the main analysis to identify reachable code
        and detect both direct and indirect recursion.
        """
        queue = deque([(tree, None)])
        self.call_graph = {'__main__': set()}
        self.reachable_funcs = set()
        
        # Map out which functions call which
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
        
        # Traverse from main scope to mark reachable functions (Dead Code Elimination)
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
        
        # Identify direct self-recursion
        for func_name, called_funcs in self.call_graph.items():
            if func_name in called_funcs:
                self.custom_functions[func_name] = "T(n)"  
        
        self.detect_indirect_recursion()

    def detect_indirect_recursion(self):
        """Standard cycle detection to find indirect recursion (A -> B -> A)."""
        for func in self.call_graph:
            visited = set()
            rec_stack = set()
            if self._has_cycle(func, visited, rec_stack):
                # Cycles in the call graph generally suggest exponential time complexity
                self.custom_functions[func] = "O(2^n)"

    def _has_cycle(self, node, visited, rec_stack):
        """Depth-First cycle detection."""
        if node in rec_stack: return True
        if node in visited: return False
        visited.add(node); rec_stack.add(node)
        for neighbor in self.call_graph.get(node, []):
            if self._has_cycle(neighbor, visited, rec_stack): return True
        rec_stack.remove(node); return False

    # -------------------------------------------------------------------------
    # UTILITIES
    # -------------------------------------------------------------------------
    def get_code_snippet(self, node):
        """Extracts the exact text from the original source for a specific node."""
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]  
            return line.strip()  
        return "Code Block"  

    def get_color(self, complexity_str):
        """Maps Big O strings to UI hex colors for line highlighting."""
        if complexity_str == "-": return "#7f8c8d"  
        if "Dead Code" in complexity_str: return "#7f8c8d"  
        if "T(n) =" in complexity_str or "n!" in complexity_str or "T(n-1) + T" in complexity_str: return "#8e44ad"  
        if "2^n" in complexity_str or "2T(" in complexity_str: return "#9b59b6"  
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c"  
        if "log" in complexity_str: return "#2980b9"  
        if "√n" in complexity_str: return "#16a085"  
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22"  
        return "#27ae60"

    def _build_time_str(self, poly, log, sqrt=0):
        """Constructs a standard Big O string based on current math degrees."""
        if poly <= 0 and log <= 0 and sqrt <= 0: return "O(1)"  
        parts = []
        if poly == 1: parts.append("n")
        elif poly > 1: parts.append(f"n^{poly}")  
        if sqrt == 1: parts.append("√n")
        elif sqrt > 1: parts.append(f"(√n)^{sqrt}")  
        if log == 1: parts.append("log n")
        elif log > 1: parts.append(f"log^{log} n")  
        return f"O({' '.join(parts)})" if parts else "O(1)"

    # -------------------------------------------------------------------------
    # HEURISTICS: EDGE CASE HANDLING
    # -------------------------------------------------------------------------
    def _is_constant_loop(self, node):
        """
        Identifies loops bound by constants (e.g., 'while i <= 3' or 'for i in range(5)').
        These execute O(1) times regardless of input 'n'.
        """
        if isinstance(node, ast.While):
            if isinstance(node.test, ast.Compare):
                # Detects if either the left side or all comparators are constants
                left_is_const = isinstance(node.test.left, ast.Constant)
                right_is_const = all(isinstance(c, ast.Constant) for c in node.test.comparators)
                if left_is_const or right_is_const: return True
        elif isinstance(node, ast.For):
            if isinstance(node.iter, ast.Call) and getattr(node.iter.func, 'id', '') == 'range':
                # e.g., range(10)
                if all(isinstance(arg, ast.Constant) for arg in node.iter.args): return True
            elif isinstance(node.iter, (ast.List, ast.Tuple, ast.Set, ast.Constant)):
                # e.g., for i in [1, 2, 3]
                if isinstance(node.iter, ast.Constant): return True
                if hasattr(node.iter, 'elts') and all(isinstance(el, ast.Constant) for el in node.iter.elts): return True
        return False

    def _is_scaling_expr(self, node):
        """
        Heuristic to see if an expression represents a variable or collection that grows with n.
        Differentiates print('hello') [O(1)] from print(my_list) [O(n)].
        """
        # Collection literals and comprehensions scale with their content count
        if isinstance(node, (ast.List, ast.Tuple, ast.Set, ast.Dict, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            return True
        # Slicing (arr[1:n]) creates a copy that scales with input size
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Slice):
            return True
        # Variable names (Names) are treated as potential scaling data structures
        if isinstance(node, ast.Name):
            return True
        # Function calls are treated as scaling since return value size is unknown
        if isinstance(node, ast.Call):
            return True
        # Constant numbers and strings return False (Standard O(1) data)
        return False

    def _is_log_loop(self, node):
        """Detects logarithmic scaling (division or doubling of state)."""
        if not isinstance(node, ast.While): return False
        for child in ast.walk(node):  
            if isinstance(child, (ast.BinOp, ast.AugAssign)):
                op = child.op
                val = child.right if isinstance(child, ast.BinOp) else child.value
                # Checks for division by constant or bit-shifting
                if isinstance(op, (ast.Div, ast.FloorDiv, ast.RShift)) and isinstance(val, ast.Constant) and val.value in [1, 2]: return True
                if isinstance(op, (ast.Mult, ast.LShift)) and isinstance(val, ast.Constant) and val.value in [1, 2]: return True
        return False  
        
    def _is_sqrt_loop(self, node):
        """Detects conditions bound by i*i <= n, yielding O(√n)."""
        if not isinstance(node, ast.While): return False  
        test = node.test  
        if isinstance(test, ast.Compare) and isinstance(test.left, ast.BinOp):  
            # while i * i <= n
            if isinstance(test.left.op, ast.Mult) and isinstance(test.left.left, ast.Name) and isinstance(test.left.right, ast.Name):
                if test.left.left.id == test.left.right.id: return True
            # while i ** 2 <= n
            elif isinstance(test.left.op, ast.Pow) and isinstance(test.left.right, ast.Constant) and test.left.right.value == 2: return True
        return False
    
    def _is_exponential_loop(self, node):
        """Detects if a loop bound scales exponentially (e.g., 1 << n or 2 ** n)."""
        if not isinstance(node, (ast.For, ast.While)):
            return False
        
        # Check 'for i in range(1 << n)'
        expr = node.iter if isinstance(node, ast.For) else node.test
        
        for child in ast.walk(expr):
            # Check for bitwise left shift (1 << n)
            if isinstance(child, ast.BinOp) and isinstance(child.op, ast.LShift):
                return True
            # Check for power operator (2 ** n)
            if isinstance(child, ast.BinOp) and isinstance(child.op, ast.Pow):
                if isinstance(child.left, ast.Constant) and child.left.value == 2:
                    return True
        return False

    # -------------------------------------------------------------------------
    # RECORDING ENGINE
    # -------------------------------------------------------------------------
    def record_line(self, node, time_override=None, space_override=None):
        """
        The central logic for processing an AST node and appending it to the result list.
        Determines both local (line-isolated) and global (nested-context) complexity.
        """
        line_text = self.get_code_snippet(node)
        
        # Get current scope nesting levels
        current_poly = self.loop_depth
        current_log = self.log_loop_depth
        current_sqrt = getattr(self, 'sqrt_loop_depth', 0)
        
        override_poly = 0
        override_log = 0
        override_sqrt = 0
        is_recurrence = False

        # Extract complexity degrees from a string override (if provided)
        if time_override:
            if any(x in time_override for x in ["T(n) =", "n!", "2^n", "2T("]):
                is_recurrence = True
            else:
                if "n log n" in time_override:
                    override_poly = 1; override_log = 1
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

        # Absolute complexity for this line is (Loop Nesting + Node's intrinsic cost)
        total_poly = current_poly + override_poly
        total_log = current_log + override_log
        total_sqrt = current_sqrt + override_sqrt
        
        is_dead = getattr(self, 'in_dead_code', False) or time_override == "Dead Code"
        display_poly = override_poly
        display_log = override_log
        display_sqrt = override_sqrt
        is_exponential = self._is_exponential_loop(node)
        
        if not time_override:
            if is_exponential:
                time_override = "O(2^n)" # Explicitly override to exponential
                is_recurrence = True     # Treat as high-weight bottleneck
            elif isinstance(node, ast.For):
                display_poly = 0 if self._is_constant_loop(node) else 1
            elif isinstance(node, ast.While):
                if self._is_constant_loop(node): display_poly = 0
                elif self._is_log_loop(node): display_log = 1
                elif self._is_sqrt_loop(node): display_sqrt = 1
                else: display_poly = 1

        # Format descriptive strings and weights for the frontend
        if time_override == "Definition":
            local_time_str = global_time_str = local_space_str = global_space_str = "-"
            t_weight = local_weight = s_weight = 0
        elif is_dead:
            local_time_str = global_time_str = local_space_str = global_space_str = "Dead Code"
            t_weight = local_weight = s_weight = -1
        else:
            local_time_str = self._build_time_str(display_poly, display_log, display_sqrt)
            if time_override and is_recurrence:
                local_time_str = global_time_str = time_override
                t_weight = local_weight = 1000 # Recurrence is prioritized as high weight
            else:
                if time_override: local_time_str = time_override
                global_time_str = self._build_time_str(total_poly, total_log, total_sqrt)
                t_weight = total_poly * 10 + total_sqrt * 7 + total_log * 5
                local_weight = display_poly * 10 + display_sqrt * 7 + display_log * 5
                
            local_space_str = space_override if space_override else "O(1)"
            global_space_str = local_space_str
            if self.recursive_calls_count > 0:
                if self.has_division and not self.has_slicing and self.recursive_calls_count == 1:
                    global_space_str = "O(log n)" # Binary recursion depth
                else:
                    global_space_str = "O(n)" # Linear recursion depth
            s_weight = 10 if "O(n)" in local_space_str else (1000 if "n!" in local_space_str or "T(n" in local_space_str else 0)

        # UI categorization labels
        op_map = {ast.For: "for loop", ast.While: "while loop", ast.If: "conditional", ast.Assign: "assignment", 
                  ast.AugAssign: "augmented assignment", ast.Return: "return statement", ast.Call: "function call", 
                  ast.FunctionDef: "function def", ast.Subscript: "array access", ast.Expr: "expression"}
        operation = op_map.get(type(node), "operation")

        # Compile the final entry
        entry = {
            "lineOfCode": line_text, "operation": operation, "local_time": local_time_str, "global_time": global_time_str,
            "local_space": local_space_str, "global_space": global_space_str, "indent": self.current_depth,
            "color": self.get_color(global_time_str), "weight": t_weight, "local_weight": local_weight,
            "local_explanation": f"Locally, this takes {local_time_str} time.", 
            "global_explanation": f"Globally, this contributes {global_time_str} complexity."
        }
        
        # Deduplication: Ensure if multiple AST nodes exist on one line, we keep the most expensive one
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            if t_weight > self.details[-1].get("weight", -1) or (t_weight == self.details[-1].get("weight") and local_weight > self.details[-1].get("local_weight")):
                self.details[-1].update(entry)
        else: self.details.append(entry)

        # Update program-wide maximums
        if not is_dead and time_override != "Definition":
            if t_weight > self.max_complexity:
                self.max_complexity = t_weight
                if t_weight < 998: self.max_poly, self.max_log, self.max_sqrt = total_poly, total_log, total_sqrt
            if s_weight > self.max_space_weight: self.max_space_weight = s_weight

    def generic_visit(self, node):
        """
        Modified generic visit. Includes terminal-logic handling so that code
        following a Return, Break, or Continue statement is flagged as dead code.
        """
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

    # -------------------------------------------------------------------------
    # NODE VISITOR HANDLERS
    # -------------------------------------------------------------------------
    def visit_FunctionDef(self, node):
        """Handles function entry, body analysis, and recurrence relation synthesis."""
        self.current_function_name = node.name
        self.recursive_calls_count = 0
        self.has_recursion_in_loop = self.has_slicing = self.has_division = False
        is_dead = node.name not in self.reachable_funcs
        self.record_line(node, time_override="Dead Code" if is_dead else "Definition")
        
        # Save state to allow clean analysis of the function body
        prev_data = (self.max_complexity, self.max_space_weight, self.max_poly, self.max_log, self.max_sqrt)
        self.max_complexity = self.max_space_weight = self.max_poly = self.max_log = self.max_sqrt = 0
        
        prev_dead = self.in_dead_code; self.in_dead_code = is_dead or prev_dead
        self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1
        self.in_dead_code = prev_dead
        
        # Recurrence Type Resolution
        if self.has_recursion_in_loop: relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2: 
            relation = "T(n) = 2T(n/2) + O(n)" if (self.has_slicing or self.has_division or self.max_poly > 0) else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            if self.has_division:
                relation = "T(n) = T(n/2) + O(n)" if self.max_poly > 0 else "T(n) = T(n/2) + O(1)"
            else:
                relation = "T(n) = T(n-1) + O(n)" if (self.max_poly > 0 or self.has_slicing) else "T(n) = T(n-1) + O(1)"
        else: relation = self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
            
        self.custom_functions[node.name] = relation
        self.custom_space[node.name] = "O(log n)" if (self.recursive_calls_count == 1 and self.has_division) else ("O(n)" if (self.recursive_calls_count > 0 or self.max_space_weight > 0) else "O(1)")
        
        # Merge function bottleneck back into global maximums
        if not is_dead:
            self.max_complexity = max(prev_data[0], self.max_complexity)
            self.max_space_weight = max(prev_data[1], self.max_space_weight)
            self.max_poly, self.max_log, self.max_sqrt = max(prev_data[2], self.max_poly), max(prev_data[3], self.max_log), max(prev_data[4], self.max_sqrt)
        else: self.max_complexity, self.max_space_weight, self.max_poly, self.max_log, self.max_sqrt = prev_data
        self.current_function_name = None

    def visit_If(self, node):
        """Analyzes both IF and ELSE branches and assumes the most expensive branch."""
        self.record_line(node)
        prev_rec = self.recursive_calls_count; self.recursive_calls_count = 0
        self.current_depth += 1; [self.visit(c) for c in node.body]; self.current_depth -= 1
        if_rec = self.recursive_calls_count; self.recursive_calls_count = 0
        self.current_depth += 1; [self.visit(c) for c in node.orelse]; self.current_depth -= 1
        self.recursive_calls_count = prev_rec + max(if_rec, self.recursive_calls_count)

    def visit_For(self, node):
        """Handles for-loops, including constant, polynomial, and exponential cases."""

        is_const = self._is_constant_loop(node)
        is_exp = self._is_exponential_loop(node)

        # -------------------------------
        # NEW: Exponential Loop Handling
        # -------------------------------
        if is_exp:
            # Force exponential behavior as dominant (like recurrence)
            self.record_line(node, time_override="O(2^n)")  # NEW

            # IMPORTANT: Do NOT increase loop_depth (not polynomial)
            # Instead, propagate inside as already exponential

            self.current_depth += 1
            self.generic_visit(node)
            self.current_depth -= 1

            return  # NEW: stop normal processing

        # -------------------------------
        # Normal Loop Handling
        # -------------------------------
        if not is_const:
            self.loop_depth += 1  # polynomial contribution

        self.record_line(node)  # FIXED: only once

        self.current_depth += 1
        self.generic_visit(node)
        self.current_depth -= 1  

        if not is_const:
            self.loop_depth -= 1

    def visit_While(self, node):
        """Handles while-loops, detecting log/sqrt patterns to adjust depths."""
        is_log, is_sqrt, is_const = self._is_log_loop(node), self._is_sqrt_loop(node), self._is_constant_loop(node)
        if not is_const:
            if is_log: self.log_loop_depth += 1
            elif is_sqrt: self.sqrt_loop_depth += 1
            else: self.loop_depth += 1
        self.record_line(node)
        self.current_depth += 1; self.generic_visit(node); self.current_depth -= 1  
        if not is_const:
            if is_log: self.log_loop_depth -= 1
            elif is_sqrt: self.sqrt_loop_depth -= 1
            else: self.loop_depth -= 1

    def visit_Call(self, node):
        """Handles function calls. Dynamically adjusts for print/pop scaling args."""
        has_scaling = any(self._is_scaling_expr(arg) for arg in node.args)
        if isinstance(node.func, ast.Name):
            f_id = self.aliases.get(node.func.id, node.func.id)
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0 or self.log_loop_depth > 0: self.has_recursion_in_loop = True  
                self.record_line(node, time_override=self.custom_functions.get(f_id, "T(n-1)"), space_override="O(n)")
            elif f_id in self.builtin_complexities:
                b = self.builtin_complexities[f_id]
                t, s = b['time'], b['space']
                # Dynamic adjustment for print based on heuristic
                if f_id == 'print': t = 'O(n)' if has_scaling else 'O(1)'
                elif f_id == 'pop' and node.args: t = 'O(n)'
                self.record_line(node, time_override=t, space_override=s)
            elif f_id in self.custom_functions:
                # Map recurrence relation strings back to Big O badges for clarity
                call_comp = self.custom_functions[f_id]
                lookup = {"T(n) = n * T(n-1)": "O(n!)", "2T(n/2)": "O(n log n)", "T(n-1) + T(n-2)": "O(2^n)", "T(n/2) + O(1)": "O(log n)", "T(n-1) + O(n)": "O(n^2)"}
                for k, v in lookup.items():
                    if k in call_comp: call_comp = v; break
                self.record_line(node, time_override=call_comp, space_override=self.custom_space.get(f_id, "O(1)"))
            else: self.record_line(node)
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.builtin_complexities:
                t, s = self.builtin_complexities[node.func.attr]['time'], self.builtin_complexities[node.func.attr]['space']
                if node.func.attr == 'pop' and node.args: t = 'O(n)'
                self.record_line(node, time_override=t, space_override=s)
            else: self.record_line(node)
        self.generic_visit(node)

    def visit_Subscript(self, node):
        """Identifies list slicing which impacts space/time [O(n)]."""
        if isinstance(node.slice, ast.Slice): self.has_slicing = True  
        self.generic_visit(node)  

    def visit_BinOp(self, node):
        """Tracks division operations to support O(log n) detection."""
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)): self.has_division = True  
        self.generic_visit(node)  

    def visit_Assign(self, node):
        """Analyzes variable assignments, detecting list multiplications or comprehensions."""
        s_ov, t_ov = "O(1)", None
        if isinstance(node.value, ast.Name) and node.value.id in self.custom_functions:
            for target in node.targets:
                if isinstance(target, ast.Name): self.aliases[target.id] = node.value.id  
        if node.value:
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List): s_ov = "O(n)"
            elif isinstance(node.value, ast.ListComp):
                gc = len(node.value.generators); s_ov = t_ov = f"O(n^{gc})" if gc > 1 else "O(n)"
            elif (isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice)) or (isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute) and node.value.func.attr == 'copy'):
                s_ov = t_ov = "O(n)"
        self.record_line(node, time_override=t_ov, space_override=s_ov)
        self.generic_visit(node)  

    def visit_AugAssign(self, node): self.record_line(node); self.generic_visit(node)  
    def visit_Return(self, node): self.record_line(node); self.generic_visit(node)  
    def visit_Expr(self, node): self.record_line(node); self.generic_visit(node)      

    # -------------------------------------------------------------------------
    # FINAL BADGE GENERATION
    # -------------------------------------------------------------------------
    def get_final_badge(self):
        """Resolves total complexity, preserving recurrence formats if necessary."""
        for line in reversed(self.details):   
            comp = line.get('global_time', '')  
            if "T(n) =" in comp or comp in ["O(n!)", "O(2^n)", "O(n log n)"]: return comp
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)

    def get_final_asymptotic_badge(self):
        """Forces all recurrence relations into their pure asymptotic (Big O) badge form."""
        for line in reversed(self.details):  
            comp = line.get('global_time', '')
            lookup = {"T(n) = n * T(n-1)": "O(n!)", "O(n!)": "O(n!)", "2T(n/2)": "O(n log n)", "T(n-1) + T(n-2)": "O(2^n)", "T(n/2) + O(1)": "O(log n)", "T(n-1) + O(n)": "O(n^2)"}
            for k, v in lookup.items():
                if k in comp: return v
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)