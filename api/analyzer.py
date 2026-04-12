# api/analyzer.py
import ast
import re
from collections import deque

class ComplexityAnalyzer(ast.NodeVisitor):

    def __init__(self, source_code):
        self.source_lines = source_code.splitlines()
        self.details = []
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
        self.reachable_funcs = set()  
        self.in_dead_code = False     
        self.has_recursion_in_loop = False  
        self.has_slicing = False            
        self.has_division = False           

        # Refined built-in complexities with better defaults
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
            'pop': {'time': 'O(1)', 'space': 'O(1)'},     # Default to O(1), overridden in visit_Call
            'insert': {'time': 'O(n)', 'space': 'O(1)'},  # Fixed Space: O(1) auxiliary
            'remove': {'time': 'O(n)', 'space': 'O(1)'},  # Fixed Space: O(1) auxiliary
            'count': {'time': 'O(n)', 'space': 'O(1)'},
            'copy': {'time': 'O(n)', 'space': 'O(n)'},
            'str': {'time': 'O(n)', 'space': 'O(n)'},
            'max': {'time': 'O(n)', 'space': 'O(1)'},
            'min': {'time': 'O(n)', 'space': 'O(1)'},
            'sum': {'time': 'O(n)', 'space': 'O(1)'},
            'input': {'time': 'O(n)', 'space': 'O(n)'},
            'print': {'time': 'O(1)', 'space': 'O(1)'},   # Default to O(1), overridden in visit_Call
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
        self.aliases = {}

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
        if node in rec_stack:
            return True
        if node in visited:
            return False

        visited.add(node)
        rec_stack.add(node)

        for neighbor in self.call_graph.get(node, []):
            if self._has_cycle(neighbor, visited, rec_stack):
                return True

        rec_stack.remove(node)
        return False

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
    
    def _is_constant_loop(self, node):
        if isinstance(node, ast.While):
            if isinstance(node.test, ast.Compare):
                left_is_const = isinstance(node.test.left, ast.Constant)
                comps_are_const = all(isinstance(c, ast.Constant) for c in node.test.comparators)
                
                left_is_name = isinstance(node.test.left, ast.Name)
                comps_are_name = all(isinstance(c, ast.Name) for c in node.test.comparators)
                
                # Check for bound like `while i <= 3:` or `while 3 >= i:`
                if (left_is_name and comps_are_const) or (left_is_const and comps_are_name) or (left_is_const and comps_are_const):
                    return True
        elif isinstance(node, ast.For):
            if isinstance(node.iter, ast.Call) and getattr(node.iter.func, 'id', '') == 'range':
                if node.iter.args and all(isinstance(arg, ast.Constant) for arg in node.iter.args):
                    return True
            elif isinstance(node.iter, ast.Constant):
                return True
            elif isinstance(node.iter, (ast.List, ast.Tuple, ast.Set)):
                if all(isinstance(el, ast.Constant) for el in node.iter.elts):
                    return True
        return False

    def _is_log_loop(self, node):
        if not isinstance(node, ast.While): return False
        for child in ast.walk(node):  
            if isinstance(child, ast.BinOp):
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.right, ast.Constant) and child.right.value == 2: return True
                if isinstance(child.op, ast.RShift) and isinstance(child.right, ast.Constant) and child.right.value == 1: return True
                if isinstance(child.op, ast.Mult) and ((isinstance(child.right, ast.Constant) and child.right.value == 2) or (isinstance(child.left, ast.Constant) and child.left.value == 2)): return True
                if isinstance(child.op, ast.LShift) and isinstance(child.right, ast.Constant) and child.right.value == 1: return True
            elif isinstance(child, ast.AugAssign):
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.value, ast.Constant) and child.value.value == 2: return True
                if isinstance(child.op, ast.RShift) and isinstance(child.value, ast.Constant) and child.value.value == 1: return True
                if isinstance(child.op, ast.Mult) and isinstance(child.value, ast.Constant) and child.value.value == 2: return True
                if isinstance(child.op, ast.LShift) and isinstance(child.value, ast.Constant) and child.value.value == 1: return True
        return False  
        
    def _is_sqrt_loop(self, node):
        if not isinstance(node, ast.While): return False  
        test = node.test  
        if isinstance(test, ast.Compare):  
            if isinstance(test.left, ast.BinOp):  
                if isinstance(test.left.op, ast.Mult):
                    if isinstance(test.left.left, ast.Name) and isinstance(test.left.right, ast.Name):
                        if test.left.left.id == test.left.right.id: return True
                elif isinstance(test.left.op, ast.Pow):
                    if isinstance(test.left.right, ast.Constant) and test.left.right.value == 2: return True
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
        
        is_dead = getattr(self, 'in_dead_code', False) or time_override == "Dead Code"

        display_poly = override_poly
        display_log = override_log
        display_sqrt = override_sqrt

        if not time_override:
            if isinstance(node, ast.For):
                # Ensure constant for-loops are O(1)
                display_poly = 0 if self._is_constant_loop(node) else 1
            elif isinstance(node, ast.While):
                # Ensure constant while-loops are O(1)
                if self._is_constant_loop(node): display_poly = 0
                elif self._is_log_loop(node): display_log = 1
                elif self._is_sqrt_loop(node): display_sqrt = 1
                else: display_poly = 1

        if time_override == "Definition":
            local_time_str = "-"
            global_time_str = "-"
            local_space_str = "-"
            global_space_str = "-"
            t_weight = 0
            local_weight = 0
            s_weight = 0
        elif is_dead:
            local_time_str = "Dead Code"
            global_time_str = "Dead Code"
            local_space_str = "Dead Code"
            global_space_str = "Dead Code"
            t_weight = -1
            local_weight = -1
            s_weight = -1
        else:
            local_time_str = self._build_time_str(display_poly, display_log, display_sqrt)
            if time_override and is_recurrence:
                local_time_str = time_override
                global_time_str = time_override
                t_weight = 1000
                local_weight = 1000
            else:
                if time_override:
                    local_time_str = time_override
                global_time_str = self._build_time_str(total_poly, total_log, total_sqrt)
                t_weight = total_poly * 10 + total_sqrt * 7 + total_log * 5
                local_weight = display_poly * 10 + display_sqrt * 7 + display_log * 5
                
            local_space_str = space_override if space_override else "O(1)"
            global_space_str = local_space_str
            if self.recursive_calls_count > 0:
                if self.has_division and not self.has_slicing and self.recursive_calls_count == 1:
                    global_space_str = "O(log n)"
                else:
                    global_space_str = "O(n)"
                    
            s_weight = 10 if "O(n)" in local_space_str else 0
            if "n!" in local_space_str or "T(n-1) + T" in local_space_str: s_weight = 1000

        operation = "operation"
        if isinstance(node, ast.For): operation = "for loop"
        elif isinstance(node, ast.While): operation = "while loop"
        elif isinstance(node, ast.If): operation = "conditional"
        elif isinstance(node, ast.Assign): operation = "assignment"
        elif isinstance(node, ast.AugAssign): operation = "augmented assignment"
        elif isinstance(node, ast.Return): operation = "return statement"
        elif isinstance(node, ast.Call): operation = "function call"
        elif isinstance(node, ast.FunctionDef): operation = "function def"
        elif isinstance(node, ast.Subscript): operation = "array access"
        elif isinstance(node, ast.Expr): operation = "expression"

        local_explanation = ""
        global_explanation = ""

        if time_override == "Definition":
            local_explanation = "Function definitions are purely declarations in Python. Parsing this definition takes O(1) time and minimal memory locally because the engine only registers the namespace, deferring execution."
            global_explanation = "Declarations only occur once and act as blueprints. They do not repeatedly execute or scale with the input data, meaning they contribute zero weight to the asymptotic global time or space constraints."
        elif is_dead:
            local_explanation = "This operation is completely unreachable given the current control flow (e.g. it appears after a return statement)."
            global_explanation = "Unreachable code has no global mathematical impact on the program's runtime or space allocation footprint."
        else:
            outer_poly = total_poly - display_poly
            outer_log = total_log - display_log
            outer_sqrt = total_sqrt - display_sqrt
            has_outer = outer_poly > 0 or outer_log > 0 or outer_sqrt > 0
            outer_str = self._build_time_str(outer_poly, outer_log, outer_sqrt)

            def get_name(n):
                if isinstance(n, ast.Name): return f"'{n.id}'"
                return "a variable"

            if isinstance(node, ast.For):
                iter_name = "its target collection"
                if isinstance(node.iter, ast.Name): iter_name = f"the data structure '{node.iter.id}'"
                elif isinstance(node.iter, ast.Call) and getattr(node.iter.func, 'id', '') == 'range': iter_name = "a dynamically generated numerical sequence"
                
                if self._is_constant_loop(node):
                    local_explanation = f"This loop iterates over a predetermined constant range or collection. Running a fixed number of times yields an isolated local complexity of {local_time_str}. Auxiliary space is {local_space_str}."
                else:
                    local_explanation = f"Locally, setting up the loop header and tracking the iterator over {iter_name} operates in an isolated complexity of {local_time_str}. Managing the loop pointer and current index requires exactly {local_space_str} auxiliary space during iteration."
                    
                if has_outer:
                    global_explanation = f"Because this loop iterates within an outer enclosing environment ({outer_str}), its local {local_time_str} duration compounds across every parent cycle. This structural nesting exponentially scales the system's execution to a global time complexity of {global_time_str}. Peak concurrent memory scales dynamically to {global_space_str}."
                else:
                    global_explanation = f"As the highest level execution block, this loop establishes the baseline algorithm rhythm. Its local duration dictates the overall global time limit of {global_time_str}. The overarching system memory requirements peak at {global_space_str}."

            elif isinstance(node, ast.While):
                if self._is_constant_loop(node):
                    local_explanation = f"This 'while' loop is bounded by a constant comparison. Because it doesn't scale with dynamic input limits, it evaluates locally in exactly {local_time_str} time utilizing {local_space_str} space."
                elif display_log > 0 or "log" in local_time_str:
                    local_explanation = f"This 'while' loop divides or shifts its target state, systematically pruning the search space to yield an optimized local evaluation time of {local_time_str}. It utilizes {local_space_str} space to manage its state variables."
                else:
                    local_explanation = f"Evaluating the condition of this 'while' loop governs execution dynamically. Locally, each check limits execution bounds to {local_time_str} time while caching the evaluation state in {local_space_str} space."
                    
                if has_outer:
                    global_explanation = f"Nesting this loop inside a parent cycle of {outer_str} transforms its local {local_time_str} evaluations into a compounded cascading effect. Consequently, the global algorithm slows to a runtime factor of {global_time_str}, demanding a peak active memory footprint of {global_space_str}."
                else:
                    global_explanation = f"Running freely at the root level, this loop forces the global time complexity directly to {global_time_str}. The total structural memory required to track the program state over time resolves to {global_space_str}."

            elif isinstance(node, ast.If):
                local_explanation = f"Calculating the boolean expression to route control flow is an instant decision point locally costing {local_time_str} time. Temporarily holding the state in the memory register utilizes {local_space_str} space."
                global_explanation = f"Though the conditional branch itself is rapidly evaluated, it occurs within a global cascading execution flow of {outer_str if has_outer else 'O(1)'}. This positions the conditional check to execute frequently enough to map its global time impact to {global_time_str}, with an overall space preservation of {global_space_str}."

            elif isinstance(node, ast.Assign):
                targets = [get_name(t) for t in getattr(node, 'targets', [])]
                target_str = ", ".join(targets) if targets else "a variable"
                if local_time_str == "O(1)":
                    local_explanation = f"Assigning a fixed computed value to {target_str} represents a constant mathematical step taking {local_time_str} time locally. The memory bounds for this static allocation are restricted to {local_space_str} space."
                elif self.has_slicing:
                    local_explanation = f"By physically partitioning data (array slicing), the operation forces the program to construct a brand new sequence for {target_str}. This deep copy heavily taxes the system locally with {local_time_str} time and allocates {local_space_str} dedicated memory space."
                else:
                    local_explanation = f"Processing and assigning the right-side evaluation to {target_str} is computationally demanding, drawing {local_time_str} time and consuming {local_space_str} active local space to store the transient structures."
                
                if has_outer:
                    global_explanation = f"Because this assignment is deeply nested ({outer_str}), a normally fast localized operation repeats countless times, driving the total global time computation up to {global_time_str}. The accumulated spatial complexity bounds hit {global_space_str}."
                else:
                    global_explanation = f"This isolated assignment executes linearly. Without cyclic nesting, its global duration directly aligns to {global_time_str} time, stabilizing its structural resource consumption at a global peak of {global_space_str}."

            elif isinstance(node, ast.Return):
                local_explanation = f"Yielding the processed value and gracefully terminating the current function's local frame is finalized in {local_time_str} time and requires {local_space_str} space for the return payload."
                global_explanation = f"Closing the frame immediately finalizes this node in the execution tree. Globally, executing up to this point establishes the sequence at a time rating of {global_time_str} and locks in the overarching memory limit to {global_space_str}."

            elif isinstance(node, ast.Call):
                func_name = "The invoked algorithm"
                is_builtin = False
                if getattr(node, 'func', None):
                    if isinstance(node.func, ast.Name): 
                        func_name = f"The native function '{node.func.id}'"
                        is_builtin = node.func.id in self.builtin_complexities
                    elif isinstance(node.func, ast.Attribute): 
                        func_name = f"The object method '{node.func.attr}'"
                        is_builtin = node.func.attr in self.builtin_complexities

                if is_recurrence:
                    local_explanation = f"By triggering itself recursively, {func_name} sets up an expanding tree of execution bounds locally defined by {local_time_str}. Creating the next scope frame allocates new memory limits on the stack equal to {local_space_str}."
                    global_explanation = f"The deep recursive calls map the system to an asymptotic recurrence relation of {global_time_str}. Because each frame remains open until the base case is hit, the global stack memory balloons dramatically to a complexity limit of {global_space_str}."
                elif is_builtin and "input" in func_name:
                    local_explanation = f"Reading stream input linearly scans the data character-by-character, evaluating locally in {local_time_str} time. Storing the newly built string takes {local_space_str} memory space proportionally."
                    global_explanation = f"Within its current scope layer, establishing I/O bridges limits the total runtime potential to {global_time_str}. Processing massive strings natively holds the global peak allocation envelope at {global_space_str}."
                elif is_builtin and ("split" in func_name or "map" in func_name):
                    local_explanation = f"Mapping or separating string elements forces the native engine to traverse the iterable entirely, scaling locally in {local_time_str} time and depositing the new structures in {local_space_str} space."
                    global_explanation = f"Because this data partition sits inside {outer_str if has_outer else 'top-level execution'}, traversing to process this logic drives the global sequence time to {global_time_str} with {global_space_str} bounds."
                elif local_time_str != "O(1)":
                    local_explanation = f"Activating {func_name} outsources logic to an intense subroutine that locally requires {local_time_str} time to resolve, reserving {local_space_str} structural space inside its local scope."
                    global_explanation = f"Because this high-cost call occurs inside a larger cascading boundary ({outer_str if has_outer else 'top-level execution'}), the multiplied global impact forces the overall program timeline to {global_time_str}. Its peak spatial demands scale to {global_space_str}."
                else:
                    local_explanation = f"Resolving {func_name} completes instantaneously under constant local bounds of {local_time_str} time and {local_space_str} space."
                    global_explanation = f"Its low cost means the global constraints are dictated purely by its surrounding environment, stabilizing the global time at {global_time_str} and space at {global_space_str}."

            elif isinstance(node, ast.Subscript):
                if isinstance(node.slice, ast.Slice):
                    local_explanation = f"Extracting a subset of data creates a detached array clone in memory locally taking {local_time_str} time and exactly {local_space_str} space."
                    global_explanation = f"Slicing in an iterative or recursive context is dangerous—this globally restricts the algorithmic performance to {global_time_str} time and heavily burdens the global heap memory with {global_space_str} limits."
                else:
                    local_explanation = f"Querying an explicit index in a contiguous array executes instantly via memory offsets locally in {local_time_str} time and minimal {local_space_str} space."
                    global_explanation = f"The instantaneous lookup doesn't compromise global scale limits. Governed strictly by context depth, the system maintains a global rating of {global_time_str} time and {global_space_str} space."
            else:
                local_explanation = f"This generic structural logic dictates an internal complexity bound of {local_time_str} time and handles its execution variables in {local_space_str} space locally."
                global_explanation = f"Propagating up to the root sequence, its environmental exposure modifies the system's global trajectory to resolve in {global_time_str} time, holding maximum spatial capacity at {global_space_str}."

        entry = {
            "lineOfCode": line_text,
            "operation": operation,
            "local_time": local_time_str,
            "global_time": global_time_str,
            "local_space": local_space_str,
            "global_space": global_space_str,
            "indent": self.current_depth,
            "color": self.get_color(global_time_str),
            "weight": t_weight,
            "local_weight": local_weight,
            "local_explanation": local_explanation,
            "global_explanation": global_explanation
        }
        
        if self.details and self.details[-1]["lineOfCode"] == line_text:
            existing_t_weight = self.details[-1].get("weight", -1)
            existing_local_weight = self.details[-1].get("local_weight", -1)
            if t_weight > existing_t_weight or (t_weight == existing_t_weight and local_weight > existing_local_weight):
                self.details[-1].update(entry)
        else:
            self.details.append(entry)

        if not is_dead and time_override != "Definition":
            if t_weight > self.max_complexity:
                self.max_complexity = t_weight
                if t_weight < 998:
                    self.max_poly = total_poly
                    self.max_log = total_log
                    self.max_sqrt = total_sqrt
            if s_weight > self.max_space_weight:
                self.max_space_weight = s_weight

    def generic_visit(self, node):
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
        time_override = "Dead Code" if is_dead else "Definition"
        space_override = "Dead Code" if is_dead else "Definition"
        
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
            if self.has_slicing or self.has_division or self.max_poly > 0:
                relation = "T(n) = 2T(n/2) + O(n)"
            else:
                relation = "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            if self.has_division and self.max_poly > 0:
                relation = "T(n) = T(n/2) + O(n)"
            elif self.has_division:
                relation = "T(n) = T(n/2) + O(1)"
            elif self.max_poly > 0 or self.has_slicing:
                relation = "T(n) = T(n-1) + O(n)"
            else:
                relation = "T(n) = T(n-1) + O(1)"
        else:
            relation = self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
            
        self.custom_functions[node.name] = relation
        
        if self.recursive_calls_count > 0:
            if self.has_division and not self.has_slicing and self.recursive_calls_count == 1:
                self.custom_space[node.name] = "O(log n)"
            else:
                self.custom_space[node.name] = "O(n)"
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
        self.record_line(node)
        prev_max_comp = self.max_complexity
        prev_max_poly = self.max_poly
        prev_max_log = self.max_log
        prev_max_sqrt = getattr(self, 'max_sqrt', 0)
        prev_rec_count = self.recursive_calls_count 
        
        self.max_complexity, self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0, 0
        self.recursive_calls_count = 0 
        self.current_depth += 1
        for child in node.body: self.visit(child)
        self.current_depth -= 1
        if_comp, if_poly, if_log, if_sqrt = self.max_complexity, self.max_poly, self.max_log, self.max_sqrt
        if_rec = self.recursive_calls_count 
        
        self.max_complexity, self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0, 0
        self.recursive_calls_count = 0
        self.current_depth += 1
        for child in node.orelse: self.visit(child)
        self.current_depth -= 1
        else_comp, else_poly, else_log, else_sqrt = self.max_complexity, self.max_poly, self.max_log, self.max_sqrt
        else_rec = self.recursive_calls_count 
        
        self.recursive_calls_count = prev_rec_count + max(if_rec, else_rec)
        
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
        is_const = self._is_constant_loop(node)
        
        if not is_const:
            self.loop_depth += 1
            
        self.record_line(node)
        self.current_depth += 1
        self.generic_visit(node)  
        self.current_depth -= 1  
        
        if not is_const:
            self.loop_depth -= 1

    def visit_While(self, node):
        is_log = self._is_log_loop(node)
        is_sqrt = self._is_sqrt_loop(node)
        is_const = self._is_constant_loop(node)
        
        if is_const: 
            pass # Constant bound while loops do NOT scale with input depth
        elif is_log: 
            self.log_loop_depth += 1  
        elif is_sqrt: 
            self.sqrt_loop_depth += 1  
        else: 
            self.loop_depth += 1  
        
        self.record_line(node)
        self.current_depth += 1
        self.generic_visit(node)  
        self.current_depth -= 1  
        
        if is_const: 
            pass
        elif is_log: 
            self.log_loop_depth -= 1
        elif is_sqrt: 
            self.sqrt_loop_depth -= 1
        else: 
            self.loop_depth -= 1
        
    def _is_collection_expr(self, node):
        """Heuristic to check if an expression scales with n."""
        # Fix for your string edge case: O(1) if len <= 1, O(n) otherwise
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return len(node.value) > 1
            
        if isinstance(node, (ast.List, ast.Tuple, ast.Set, ast.Dict, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            if hasattr(node, 'elts') and len(node.elts) > 5: return True
            if isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp)): return True
            return False
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Slice):
            return True
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in ['list', 'set', 'dict', 'sorted', 'map', 'filter']:
                return True
        return False

def visit_Call(self, node):
    chain_time, chain_space = None, None
    chain_poly = 0  

    # Detect chained attribute calls
    for child in ast.walk(node):
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
            attr = child.func.attr
            if attr in self.builtin_complexities:
                b = self.builtin_complexities[attr]
                if "n log n" in b['time']:
                    chain_poly = max(chain_poly, 2)
                elif "n" in b['time']:
                    chain_poly = max(chain_poly, 1)
                if "O(n)" in b['space']:
                    chain_space = "O(n)"

    if chain_poly == 2:
        chain_time = "O(n log n)"
    elif chain_poly == 1:
        chain_time = "O(n)"

    # NEW: detect scaling arguments (lists, slices, etc.)
    has_scaling_arg = any(self._is_collection_expr(arg) for arg in node.args)

    if isinstance(node.func, ast.Name):
        f_id = self.aliases.get(node.func.id, node.func.id)

        # recursion handling (unchanged)
        if f_id == self.current_function_name:
            self.recursive_calls_count += 1
            if self.loop_depth > 0 or self.log_loop_depth > 0:
                self.has_recursion_in_loop = True  

            rel = self.custom_functions.get(f_id, "T(n-1)")
            self.record_line(node, time_override=rel, space_override="O(n)")

        # builtin functions
        elif f_id in self.builtin_complexities:
            b = self.builtin_complexities[f_id]
            t, s = b['time'], b['space']

            # =========================
            # UPDATED PRINT LOGIC (YOUR REQUEST)
            # =========================
            if f_id == 'print':
                # O(n) if printing collections/strings/lists/etc.
                t = 'O(n)' if has_scaling_arg else 'O(1)'

            # pop behavior
            if f_id == 'pop' and node.args:
                t = 'O(n)'

            self.record_line(node, time_override=t, space_override=s)

        # user-defined functions
        elif f_id in self.custom_functions:
            call_comp = self.custom_functions[f_id]

            if "T(n) = n * T(n-1)" in call_comp:
                call_comp = "O(n!)"
            elif "2T(n/2)" in call_comp:
                call_comp = "O(n log n)"
            elif "T(n-1) + T(n-2)" in call_comp:
                call_comp = "O(2^n)"
            elif "T(n/2) + O(1)" in call_comp:
                call_comp = "O(log n)"             
            elif "T(n-1) + O(n)" in call_comp:
                call_comp = "O(n^2)"               
            elif "T(n/2) + O(n)" in call_comp:
                call_comp = "O(n)"
            elif "2T(n/2) + O(1)" in call_comp:
                call_comp = "O(n)"
            elif "T(n-1)" in call_comp:
                call_comp = "O(n)"

            self.record_line(
                node,
                time_override=call_comp,
                space_override=self.custom_space.get(f_id, "O(1)")
            )

        else:
            self.record_line(node)

    # attribute calls (e.g. list.pop())
    elif isinstance(node.func, ast.Attribute):
        if node.func.attr in self.builtin_complexities:
            t = chain_time if chain_time else self.builtin_complexities[node.func.attr]['time']
            s = chain_space if chain_space else self.builtin_complexities[node.func.attr]['space']

            if node.func.attr == 'pop' and node.args:
                t = 'O(n)'

            self.record_line(node, time_override=t, space_override=s)
        else:
            self.record_line(node, time_override=chain_time, space_override=chain_space)

    self.generic_visit(node)

    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice): self.has_slicing = True  
        self.generic_visit(node)  

    def visit_BinOp(self, node):
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)): self.has_division = True  
        self.generic_visit(node)  

    def visit_Assign(self, node):
        space_override = "O(1)"
        time_override = None
        if isinstance(node.value, ast.Name):
            if node.value.id in self.custom_functions:  
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self.aliases[target.id] = node.value.id  
        if node.value:
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List): space_override = "O(n)"  
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
            comp = line.get('global_time', '')  
            if "T(n) =" in comp: return comp
            if comp in ["O(n!)", "O(2^n)", "O(n log n)"]: return comp
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)

    def get_final_asymptotic_badge(self):
        for line in reversed(self.details):  
            comp = line.get('global_time', '')
            if "T(n) = n * T(n-1)" in comp or comp == "O(n!)": return "O(n!)"
            elif "2T(n/2)" in comp or comp == "O(n log n)": return "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp or comp == "O(2^n)": return "O(2^n)"
            elif "T(n/2) + O(1)" in comp: return "O(log n)"    
            elif "T(n-1) + O(n)" in comp: return "O(n^2)"      
            elif "T(n/2) + O(n)" in comp: return "O(n)"
            elif "2T(n/2) + O(1)" in comp: return "O(n)"   
            elif "T(n-1)" in comp: return "O(n)"
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)