# Import FastAPI framework to build REST API endpoints
from fastapi import FastAPI, HTTPException

# Import system and OS modules for path handling and runtime utilities
import sys  # Used for stdout redirection and path adjustments
import os   # Used to get absolute paths and directory information

# StringIO allows capturing printed output from exec() calls
from io import StringIO

# Middleware to enable Cross-Origin Resource Sharing (CORS)
from fastapi.middleware.cors import CORSMiddleware

# Pydantic's BaseModel used for request validation in FastAPI
from pydantic import BaseModel

# Abstract Syntax Tree module for analyzing Python source code programmatically
import ast

# Regular expression module for pattern matching in code analysis
import re


# -------------------------------
# VERCEL IMPORT FIX
# -------------------------------
# Ensures that when deployed (e.g., Vercel), the current directory is added to sys.path
# This allows local imports like `database` and `models` to work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


# -------------------------------
# DATABASE AND MODEL IMPORTS
# -------------------------------
from database import projects_collection  # MongoDB collection for saving projects
from models import ProjectModel           # Pydantic model representing a project
from bson import ObjectId                 # MongoDB ObjectId type for document IDs
from collections import deque             # Double-ended queue used for BFS traversal


# -------------------------------
# CREATE FASTAPI APP INSTANCE
# -------------------------------
app = FastAPI()  # Create the main FastAPI application


# -------------------------------
# ENABLE CORS
# -------------------------------
# This allows frontend apps from any origin to interact with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Allow all domains
    allow_credentials=True,     # Allow cookies and credentials
    allow_methods=["*"],        # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],        # Allow all request headers
)


# -------------------------------
# REQUEST MODEL FOR CODE ANALYSIS
# -------------------------------
class CodePayload(BaseModel):
    # The Python code string submitted by the user for analysis
    code: str


# ============================================================
# CLASS: COMPLEXITY ANALYZER
# ============================================================
# Inherits from ast.NodeVisitor to traverse and analyze Python AST nodes
class ComplexityAnalyzer(ast.NodeVisitor):

    # Constructor: initialize analyzer with source code
    def __init__(self, source_code):
        # Split source code into lines for line-by-line analysis
        self.source_lines = source_code.splitlines()

        # List of dictionaries storing time complexity per line
        self.details = []

        # List of dictionaries storing space complexity per line
        self.space_details = []

        # Track current indentation depth for UI display
        self.current_depth = 0

        # Track nesting depth of loops
        self.loop_depth = 0             # Standard loops
        self.log_loop_depth = 0         # Logarithmic loops
        self.sqrt_loop_depth = 0        # Square-root loops

        # Track maximum observed complexity
        self.max_complexity = 0         # Weighted max complexity for badge display
        self.max_poly = 0               # Polynomial exponent
        self.max_log = 0                # Logarithmic exponent
        self.max_sqrt = 0               # Square-root exponent

        # Track maximum space complexity weight
        self.max_space_weight = 0

        # Dictionary mapping function names to recurrence relation strings
        self.custom_functions = {}

        # Dictionary mapping function names to space complexities
        self.custom_space = {}

        # Current function being analyzed
        self.current_function_name = None

        # Count of recursive calls within the current function
        self.recursive_calls_count = 0

        # Symbol table mapping function names to AST nodes
        self.symbol_table = {}

        # ---------------------------
        # Dead Code Detection Flags
        # ---------------------------
        self.reachable_funcs = set()  # Functions reachable from main
        self.in_dead_code = False     # Flag if currently analyzing dead/unreachable code

        # ---------------------------
        # Special Feature Flags
        # ---------------------------
        self.has_recursion_in_loop = False  # Detect recursion inside loops
        self.has_slicing = False            # Detect slicing operations
        self.has_division = False           # Detect division or right-shift loops

        # ---------------------------
        # Built-in function complexities
        # ---------------------------
        self.builtin_complexities = {
            'sort': {'time': 'O(n log n)', 'space': 'O(n)'},   # Sorting a list
            'join': {'time': 'O(n)', 'space': 'O(n)'},         # String join
            'list': {'time': 'O(n)', 'space': 'O(n)'},         # Creating a list
            'index': {'time': 'O(n)', 'space': 'O(1)'},        # Searching list index
            'append': {'time': 'O(1)', 'space': 'O(1)'},       # List append
            'copy': {'time': 'O(n)', 'space': 'O(n)'}          # List copy
        }

        # Tracks aliases of functions (e.g., f = fibonacci)
        self.aliases = {}

    def bfs_first_pass(self, tree):
        # Initialize a queue for BFS traversal of the AST.
        # Each element is a tuple: (current_node, current_function_name)
        queue = deque([(tree, None)])
        
        # Initialize the call graph with a special __main__ node representing the top-level code
        self.call_graph = {'__main__': set()}
        
        # Perform BFS traversal to map function definitions and function calls
        while queue:
            current_node, current_func = queue.popleft()  # Dequeue next AST node and current function context
            
            # If the node is a function definition, add it to the symbol table
            if isinstance(current_node, ast.FunctionDef):
                self.symbol_table[current_node.name] = current_node  # Map function name to its AST node
                current_func = current_node.name  # Update current function context
                if current_func not in self.call_graph:
                    self.call_graph[current_func] = set()  # Initialize set of functions it calls
                    
            # If the node is a function call (direct call using its name)
            elif isinstance(current_node, ast.Call) and isinstance(current_node.func, ast.Name):
                called_func = current_node.func.id  # Extract function name being called
                if current_func:
                    self.call_graph[current_func].add(called_func)  # Add called function to the current function's set
                else:
                    self.call_graph['__main__'].add(called_func)  # Top-level call added under __main__
            
            # Add all children of the current node to the queue for BFS
            for child in ast.iter_child_nodes(current_node):
                queue.append((child, current_func))
        
        # -----------------------------
        # DEAD CODE DETECTION
        # -----------------------------
        # Identify which functions are actually reachable from __main__
        self.reachable_funcs = set()
        reach_queue = deque(['__main__'])  # Start BFS from main execution block
        visited = set(['__main__'])
        
        while reach_queue:
            curr = reach_queue.popleft()
            for neighbor in self.call_graph.get(curr, []):  # Check all functions called by the current function
                if neighbor not in visited:
                    visited.add(neighbor)
                    self.reachable_funcs.add(neighbor)  # Mark function as reachable
                    reach_queue.append(neighbor)
        
        # Mark functions that call themselves directly as recursive for initial labeling
        for func_name, called_funcs in self.call_graph.items():
            if func_name in called_funcs:
                self.custom_functions[func_name] = "T(n)"  # Recursion detected
        
        # Detect indirect/mutual recursion across functions
        self.detect_indirect_recursion()


    def detect_indirect_recursion(self):
        # Check for cycles in the call graph (mutual recursion)
        for func in self.call_graph:
            visited = set()
            if self._has_cycle(func, visited):
                self.custom_functions[func] = "O(2^n)"  # Worst-case exponential time if mutual recursion exists


    def _has_cycle(self, current_func, visited):
        # Helper recursive method to detect cycles in the call graph
        if current_func in visited:  # Cycle detected
            return True
        visited.add(current_func)
        # Recursively check all neighbors (functions called by current function)
        for neighbor in self.call_graph.get(current_func, []):
            if self._has_cycle(neighbor, visited.copy()):  # Use a copy to avoid shared state
                return True
        return False  # No cycle found


    def get_code_snippet(self, node):
        # Retrieve the exact line of code corresponding to an AST node
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]  # AST line numbers are 1-indexed
            return line.strip()  # Remove leading/trailing whitespace
        return "Code Block"  # Fallback if no line number is available


    def get_color(self, complexity_str):
        # Assign a color code for visualizing complexity in a UI
        if "Dead Code" in complexity_str: return "#7f8c8d"  # Grey for dead code
        if "T(n) =" in complexity_str or "n!" in complexity_str or "T(n-1) + T" in complexity_str: return "#8e44ad"  # Purple for general recurrences
        if "2^n" in complexity_str or "2T(" in complexity_str: return "#9b59b6"  # Deep purple for exponential
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c"  # Red for quadratic/cubic
        if "log" in complexity_str: return "#2980b9"  # Blue for logarithmic
        if "√n" in complexity_str: return "#16a085"  # Teal for square-root
        if "O(n)" in complexity_str or "T(n" in complexity_str: return "#e67e22"  # Orange for linear or generic T(n)
        return "#27ae60"  # Green for constant or simple operations


    def _build_time_str(self, poly, log, sqrt=0):
        # Build a human-readable big-O string based on polynomial, logarithmic, and square-root exponents
        if poly == 0 and log == 0 and sqrt == 0: return "O(1)"  # Constant complexity
        
        parts = []
        if poly == 1: parts.append("n")
        elif poly > 1: parts.append(f"n^{poly}")  # Polynomial exponent
        
        if sqrt == 1: parts.append("√n")
        elif sqrt > 1: parts.append(f"(√n)^{sqrt}")  # Square-root exponent
        
        if log == 1: parts.append("log n")
        elif log > 1: parts.append(f"log^{log} n")  # Logarithmic exponent
        
        if not parts: return "O(1)"
        return f"O({' '.join(parts)})"  # Concatenate parts into a single big-O string


    def _is_log_loop(self, node):
        # Detect if a while loop is a logarithmic loop (reduces by half each iteration)
        if not isinstance(node, ast.While):
            return False
        for child in ast.walk(node):  # Traverse all subnodes of the while loop
            if isinstance(child, ast.BinOp):
                # Division by 2 (x = x / 2) or right shift (x >> 1) indicates logarithmic
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.right, ast.Constant) and child.right.value == 2:
                    return True
                if isinstance(child.op, ast.RShift) and isinstance(child.right, ast.Constant) and child.right.value == 1:
                    return True
            elif isinstance(child, ast.AugAssign):
                # Handles augmented assignment like x /= 2 or x >>= 1
                if isinstance(child.op, (ast.Div, ast.FloorDiv)) and isinstance(child.value, ast.Constant) and child.value.value == 2:
                    return True
                if isinstance(child.op, ast.RShift) and isinstance(child.value, ast.Constant) and child.value.value == 1:
                    return True
        return False  # Not a logarithmic loop
        
    def _is_sqrt_loop(self, node):
        # Check if a given AST node is a while loop whose iteration behaves like √n complexity.
        
        if not isinstance(node, ast.While):
            return False  # Only while loops can have sqrt-like behavior
        
        test = node.test  # Get the condition being evaluated in the while loop
        
        if isinstance(test, ast.Compare):  # Only consider loops with a comparison (e.g., i*i < n)
            if isinstance(test.left, ast.BinOp):  # Check the left-hand side of the comparison for a binary operation
                if isinstance(test.left.op, ast.Mult):
                    # Check for pattern: x * x < n, which indicates √n iterations
                    if isinstance(test.left.left, ast.Name) and isinstance(test.left.right, ast.Name):
                        if test.left.left.id == test.left.right.id:  # Same variable multiplied by itself
                            return True
                elif isinstance(test.left.op, ast.Pow):
                    # Check for pattern: x ** 2 < n, which also indicates √n iterations
                    if isinstance(test.left.right, ast.Constant) and test.left.right.value == 2:
                        return True
        return False  # Not a √n loop if no pattern matches

    def record_line(self, node, time_override=None, space_override=None):
        # Record complexity information for a single line of code (AST node)
        
        line_text = self.get_code_snippet(node)  # Get the actual source code text for reporting
        
        # Track current complexity depth from loops
        current_poly = self.loop_depth
        current_log = self.log_loop_depth
        current_sqrt = getattr(self, 'sqrt_loop_depth', 0)
        
        # Initialize override values in case the user specifies exact complexity
        override_poly = 0
        override_log = 0
        override_sqrt = 0
        is_recurrence = False

        if time_override:
            # Check if the override indicates a recurrence relation or factorial/exponential
            if any(x in time_override for x in ["T(n) =", "n!", "2^n", "2T("]):
                is_recurrence = True
            else:
                # Convert specific Big-O notations into polynomial, log, and sqrt counters
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
                    # Extract n^k from notation using regex
                    match = re.search(r"O\(n\^(\d+)", time_override)
                    if match:
                        override_poly = int(match.group(1))
                        override_log = 1 if "log n" in time_override else 0

        # -> FIX: Unindented the following block so it runs for every line
        # Combine loop depths and overrides to get effective complexity for this line
        total_poly = current_poly + override_poly
        total_log = current_log + override_log
        total_sqrt = current_sqrt + override_sqrt
        
        # -> FIX: Corrected typo 'in_dead_coe' to 'in_dead_code'
        is_dead = getattr(self, 'in_dead_code', False) or time_override == "Dead Code"

        # Determine the time complexity string and weight for sorting in visualization
        if time_override and is_recurrence and not is_dead:
            time_str = time_override
            t_weight = 1000  # Recurrence gets max weight to highlight
            local_weight = 1000
        elif is_dead:
            time_str = "Dead Code"
            t_weight = -1
            local_weight = -1
        else:
            # Default handling based on node type and detected loops
            display_poly = override_poly
            display_log = override_log
            display_sqrt = override_sqrt
            
            if not time_override:
                if isinstance(node, ast.For):
                    display_poly = 1  # For loops assumed linear unless nested
                elif isinstance(node, ast.While):
                    if self._is_log_loop(node):
                        display_log = 1
                    elif self._is_sqrt_loop(node):
                        display_sqrt = 1
                    else:
                        display_poly = 1  # Default linear if no special pattern detected
            
            # Build the readable complexity string (e.g., O(n log n))
            time_str = self._build_time_str(display_poly, display_log, display_sqrt)
            t_weight = total_poly * 10 + total_sqrt * 7 + total_log * 5
            local_weight = display_poly * 10 + display_sqrt * 7 + display_log * 5

        # Determine space complexity
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
        """Intercepts all child nodes of a given AST node to detect dead code 
        that occurs after terminal statements like return, break, or continue."""
        
        # Iterate through all named fields of the current AST node
        for field, value in ast.iter_fields(node):
            
            # If the field value is a list of child nodes
            if isinstance(value, list):
                hit_terminal = False  # Flag to mark if a terminal statement was encountered
                
                # Visit each item in the list
                for item in value:
                    if isinstance(item, ast.AST):
                        if hit_terminal:
                            # Any node after a terminal statement is considered dead code
                            prev_dead = getattr(self, 'in_dead_code', False)  # Preserve previous dead code state
                            self.in_dead_code = True  # Mark current node as dead code
                            self.visit(item)  # Recursively visit the dead code node
                            self.in_dead_code = prev_dead  # Restore previous dead code state
                        else:
                            self.visit(item)  # Visit normally if no terminal encountered yet
                            # If current item is a terminal statement, set the flag
                            if isinstance(item, (ast.Return, ast.Break, ast.Continue)):
                                hit_terminal = True
                                
            # If the field value is a single AST node (not a list), visit it normally
            elif isinstance(value, ast.AST):
                self.visit(value)


    def visit_FunctionDef(self, node):
        """Handles function definitions to detect recursion, compute complexities, 
        and mark dead functions if unreachable."""
        
        # Track the name of the currently visited function
        self.current_function_name = node.name
        # Reset recursion and special loop/slicing flags for this function
        self.recursive_calls_count = 0
        self.has_recursion_in_loop = False
        self.has_slicing = False
        self.has_division = False
        
        # Determine if the function is unreachable (dead code)
        is_dead = node.name not in self.reachable_funcs
        # Set default complexity indicators for dead or alive functions
        time_override = "Dead Code" if is_dead else "O(1)"
        space_override = "Dead Code" if is_dead else "O(1)"
        
        # Record the function node as a line in the analyzer with overrides
        self.record_line(node, time_override=time_override, space_override=space_override)
        
        # Preserve the previous maximum complexity and space weights
        prev_t, prev_s = self.max_complexity, self.max_space_weight
        prev_poly, prev_log = self.max_poly, self.max_log
        prev_sqrt = getattr(self, 'max_sqrt', 0)
        
        # Reset complexity tracking for this function scope
        self.max_complexity, self.max_space_weight = 0, 0
        self.max_poly, self.max_log, self.max_sqrt = 0, 0, 0
        
        # Preserve previous dead code state and set for this function
        prev_dead = getattr(self, 'in_dead_code', False)
        self.in_dead_code = is_dead or prev_dead
        
        # Increase current depth for proper indentation in output
        self.current_depth += 1
        # Recursively visit all child nodes in this function
        self.generic_visit(node)
        # Decrement depth after visiting children
        self.current_depth -= 1
        
        # Restore previous dead code state
        self.in_dead_code = prev_dead
        
        # Determine the recurrence/complexity relation for this function
        if self.has_recursion_in_loop:
            # Recursion occurs inside a loop
            relation = "T(n) = n * T(n-1) + O(1)"
        elif self.recursive_calls_count >= 2:
            # Multiple recursive calls in the function
            # If slicing/division occurs, assume divide-and-conquer; else Fibonacci-like
            relation = "T(n) = 2T(n/2) + O(n)" if (self.has_slicing or self.has_division) else "T(n) = T(n-1) + T(n-2) + O(1)"
        elif self.recursive_calls_count == 1:
            # Single recursive call
            relation = "T(n) = T(n-1) + O(1)"
        else:
            # No recursion; compute complexity based on loops
            relation = self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)
        
        # Store the computed time complexity for this function
        self.custom_functions[node.name] = relation
        
        # --------------------------
        # Space complexity estimation
        # --------------------------
        if self.recursive_calls_count > 0:
            if self.has_division and not self.has_slicing and self.recursive_calls_count == 1:
                # Divide-and-conquer recursion (e.g., Binary Search) uses logarithmic stack
                self.custom_space[node.name] = "O(log n)"
            else:
                # Standard recursion or slicing uses linear stack
                self.custom_space[node.name] = "O(n)"
        elif self.max_space_weight > 0:
            # Non-recursive functions with loops or data structures use linear space
            self.custom_space[node.name] = "O(n)"
        else:
            # Minimal space usage
            self.custom_space[node.name] = "O(1)"
        
        # --------------------------
        # Restore or merge complexity tracking
        # --------------------------
        if not is_dead:
            # Merge current function's max complexity with the previous context
            self.max_complexity = max(prev_t, self.max_complexity)
            self.max_space_weight = max(prev_s, self.max_space_weight)
            self.max_poly = max(prev_poly, self.max_poly)
            self.max_log = max(prev_log, self.max_log)
            self.max_sqrt = max(prev_sqrt, getattr(self, 'max_sqrt', 0))
        else:
            # Restore previous values without modification for dead code
            self.max_complexity = prev_t
            self.max_space_weight = prev_s
            self.max_poly = prev_poly
            self.max_log = prev_log
            self.max_sqrt = prev_sqrt
        
        # Clear the current function tracker after visiting
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
        """Handles FOR loops, updating loop depth and recording complexity."""
        
        # Increment loop depth counter to account for nesting
        self.loop_depth += 1
        
        # Record the FOR loop as a line for complexity tracking
        self.record_line(node)
        
        # Increase current depth for child nodes to track indentation/nesting
        self.current_depth += 1
        self.generic_visit(node)  # Visit all children of the FOR loop (body, else)
        self.current_depth -= 1  # Restore depth after visiting loop body
        
        # Decrement loop depth after finishing this loop to maintain accurate nesting
        self.loop_depth -= 1

    def visit_While(self, node):
        """Handles WHILE loops with special detection for logarithmic and square-root complexity loops."""

        # Check if this while-loop represents a logarithmic (dividing by 2) loop
        is_log = self._is_log_loop(node)
        # Check if this while-loop represents a square-root iteration loop (i*i <= n pattern)
        is_sqrt = self._is_sqrt_loop(node)
        
        # Increment the appropriate loop depth counter depending on type
        if is_log:
            self.log_loop_depth += 1  # Track nesting of logarithmic loops
        elif is_sqrt:
            self.sqrt_loop_depth += 1  # Track nesting of square-root loops
        else:
            self.loop_depth += 1  # Standard linear loop nesting
        
        # Record this while-loop node for complexity tracking
        self.record_line(node)
        
        # Increase current depth for visiting child nodes (loop body)
        self.current_depth += 1
        self.generic_visit(node)  # Recursively visit all child nodes in the loop body
        self.current_depth -= 1  # Restore depth after finishing the loop body
        
        # Decrement the corresponding depth counter after visiting the loop
        if is_log:
            self.log_loop_depth -= 1
        elif is_sqrt:
            self.sqrt_loop_depth -= 1
        else:
            self.loop_depth -= 1


    def visit_Call(self, node):
        """Handles function calls, including recursion, custom functions, and built-in complexities."""

        # Initialize variables for tracking method chaining complexities
        chain_time, chain_space = None, None
        chain_poly = 0  # Polynomial order of the chain
        
        # Walk through all subnodes to detect chained calls like list.copy().sort()
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
                attr = child.func.attr
                if attr in self.builtin_complexities:
                    b = self.builtin_complexities[attr]
                    # Determine time complexity of the chain
                    if "n log n" in b['time']:
                        chain_poly = max(chain_poly, 2)
                    elif "n" in b['time']:
                        chain_poly = max(chain_poly, 1)
                    # Determine space complexity of the chain
                    if "O(n)" in b['space']:
                        chain_space = "O(n)"
        
        # Set the chain time string based on detected polynomial order
        if chain_poly == 2:
            chain_time = "O(n log n)"
        elif chain_poly == 1:
            chain_time = "O(n)"
        
        # -------------------------
        # Handle function calls
        # -------------------------
        if isinstance(node.func, ast.Name):
            # Resolve function aliases if any exist
            f_id = self.aliases.get(node.func.id, node.func.id)
            
            # Detect recursion: function calls itself
            if f_id == self.current_function_name:
                self.recursive_calls_count += 1
                if self.loop_depth > 0 or self.log_loop_depth > 0:
                    self.has_recursion_in_loop = True  # Recursion inside a loop detected
                
                # Get recurrence relation for this function and record it
                rel = self.custom_functions.get(f_id, "T(n-1)")
                self.record_line(node, time_override=rel, space_override="O(n)")
            
            # Handle built-in functions
            elif f_id in self.builtin_complexities:
                b = self.builtin_complexities[f_id]
                self.record_line(node, time_override=b['time'], space_override=b['space'])
            
            # Handle custom user-defined functions
            elif f_id in self.custom_functions:
                call_comp = self.custom_functions[f_id]
                # Convert known recurrence relations into standard Big-O for display
                if "T(n) = n * T(n-1)" in call_comp:
                    call_comp = "O(n!)"
                elif "2T(n/2)" in call_comp:
                    call_comp = "O(n log n)"
                elif "T(n-1) + T(n-2)" in call_comp:
                    call_comp = "O(2^n)"
                elif "T(n-1)" in call_comp:
                    call_comp = "O(n)"
                
                # Record line with custom function complexities
                self.record_line(node, time_override=call_comp, space_override=self.custom_space.get(f_id, "O(1)"))
            else:
                # Unknown function, fallback to generic record
                self.record_line(node)
        
        # Handle attribute function calls (e.g., list.sort())
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in self.builtin_complexities:
                # Use chain_time/chain_space if method chaining was detected
                t = chain_time if chain_time else self.builtin_complexities[node.func.attr]['time']
                s = chain_space if chain_space else self.builtin_complexities[node.func.attr]['space']
                self.record_line(node, time_override=t, space_override=s)
            else:
                # Unknown attribute call, use detected chain metrics if available
                self.record_line(node, time_override=chain_time, space_override=chain_space)
        
        # Recursively visit child nodes of this call
        self.generic_visit(node)

    def visit_Subscript(self, node):
        # Detects slicing operations, e.g., arr[start:end:step], which affect complexity
        if isinstance(node.slice, ast.Slice):
            self.has_slicing = True  # Mark that slicing is used in this function
        self.generic_visit(node)  # Visit all children of this subscript node


    def visit_BinOp(self, node):
        # Detect division or right-shift operations which may indicate logarithmic behavior
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.RShift)):
            self.has_division = True  # Mark that division exists in this function
        self.generic_visit(node)  # Recursively visit operands


    def visit_Assign(self, node):
        # Default space and time complexity for assignments
        space_override = "O(1)"
        time_override = None

        # Edge Case: Function aliasing (e.g., my_func = fibonacci)
        if isinstance(node.value, ast.Name):
            if node.value.id in self.custom_functions:  # Check if RHS is a known function
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self.aliases[target.id] = node.value.id  # Map alias to original function

        # Analyze the RHS for complexity implications
        if node.value:
            # Multiplying lists can increase space complexity
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                    space_override = "O(n)"  # List multiplication allocates extra memory

            # Handle list comprehensions
            elif isinstance(node.value, ast.ListComp):
                gen_count = len(node.value.generators)  # Count nested loops in comprehension
                if gen_count > 1:
                    space_override = f"O(n^{gen_count})"
                    time_override = f"O(n^{gen_count})"  # Nested comprehensions increase both time & space
                else:
                    space_override = "O(n)"
                    time_override = "O(n)"  # Single generator list comprehension

            # Handle slicing in assignment: arr[start:end]
            elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
                space_override = "O(n)"  # Slicing creates a copy
                time_override = "O(n)"  # Slicing iterates over n elements

            # Edge Case: copy() method of list or other collection
            elif isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute) and node.value.func.attr == 'copy':
                space_override = "O(n)"  # Copy allocates space for n elements

        # Record this assignment node with calculated complexity
        self.record_line(node, time_override=time_override, space_override=space_override)
        self.generic_visit(node)  # Visit all child nodes


    def visit_AugAssign(self, node):
        # Handles augmented assignments like a += 1, a *= 2
        self.record_line(node)  # Record complexity for this operation
        self.generic_visit(node)  # Recursively visit operands


    def visit_Return(self, node):
        # Default complexity for return statements
        space_override = "O(1)"
        time_override = None

        if node.value:
            # Multiplying lists in return increases space
            if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, ast.Mult):
                if isinstance(node.value.left, ast.List) or isinstance(node.value.right, ast.List):
                    space_override = "O(n)"

            # List comprehensions in return
            elif isinstance(node.value, ast.ListComp):
                gen_count = len(node.value.generators)
                if gen_count > 1:
                    space_override = f"O(n^{gen_count})"
                    time_override = f"O(n^{gen_count})"
                else:
                    space_override = "O(n)"
                    time_override = "O(n)"

            # Slicing in return statement
            elif isinstance(node.value, ast.Subscript) and isinstance(node.value.slice, ast.Slice):
                space_override = "O(n)"
                time_override = "O(n)"  # Iterating over n elements for slicing

        # Record the return node with its complexity
        self.record_line(node, time_override=time_override, space_override=space_override)
        self.generic_visit(node)  # Visit any nested nodes (expressions in return)
    
    def visit_Expr(self, node):
        # Handle expression statements (e.g., function calls or standalone computations)
        self.record_line(node)        # Record time & space complexity for this line
        self.generic_visit(node)      # Visit any child nodes recursively


    def get_final_badge(self):
        # Computes the final "recurrence" badge (e.g., raw T(n) expression if recursion exists)
        for line in reversed(self.details):   # Iterate from bottom to top to catch last high-complexity lines
            comp = line.get('complexity', '')  # Extract recorded complexity for this line
            # If the line contains a raw recurrence (T(n) =) or a recognized closed-form high-complexity
            if "T(n) =" in comp: return comp
            if comp in ["O(n!)", "O(2^n)", "O(n log n)"]: return comp
        # Fallback: use polynomial/log/sqrt info from collected loops
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)


    def get_final_asymptotic_badge(self):
        # Converts any recurrence or special complexity into a standard asymptotic notation
        for line in reversed(self.details):  # Check latest lines first
            comp = line.get('complexity', '')
            if "T(n) = n * T(n-1)" in comp or comp == "O(n!)": return "O(n!)"
            elif "2T(n/2)" in comp or comp == "O(n log n)": return "O(n log n)"
            elif "T(n-1) + T(n-2)" in comp or comp == "O(2^n)": return "O(2^n)"
            elif "T(n-1)" in comp: return "O(n)"
        # Fallback: build from max_poly, max_log, max_sqrt
        return self._build_time_str(self.max_poly, self.max_log, self.max_sqrt)


# ---------------------- FastAPI Endpoints ----------------------

@app.post("/api/analyze") 
@app.post("/analyze") 
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)                 # Parse submitted Python code into AST
        analyzer = ComplexityAnalyzer(payload.code)   # Instantiate analyzer

        analyzer.bfs_first_pass(tree)                 # First pass to build call graph and detect recursion
        for name, node in analyzer.symbol_table.items():
            analyzer.visit(node)                      # Visit each user-defined function to collect complexity

        # Reset global details for final traversal
        analyzer.details, analyzer.space_details = [], []
        analyzer.max_complexity, analyzer.max_space_weight = 0, 0
        analyzer.max_poly, analyzer.max_log, analyzer.max_sqrt = 0, 0, 0
        analyzer.current_depth, analyzer.loop_depth, analyzer.log_loop_depth, analyzer.sqrt_loop_depth = 0, 0, 0, 0
        analyzer.visit(tree)                           # Full traversal of AST to record line-by-line complexity

        # Detect if any line is a recursive function call
        is_recursive = any("T(n) =" in line.get('complexity', '') for line in analyzer.details)

        # Convert complexities into standard asymptotic notation per line
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

        # Return final structured JSON
        return {
            "status": "success",
            "total": analyzer.get_final_asymptotic_badge(),   # Worst-case asymptotic complexity
            "total_recurrence": analyzer.get_final_badge(),   # Raw recurrence form
            "lines": asymptotic_lines,                        # Per-line complexity in standard notation
            "recurrence_lines": analyzer.details,             # Original raw recorded details
            "space_total": "O(n)" if analyzer.max_space_weight > 0 else "O(1)",  # Total space
            "space_lines": analyzer.space_details,            # Per-line space complexity
            "is_recursive": is_recursive                       # True if recursion detected anywhere
        }
    except Exception as e:
        # In case of parsing errors or execution issues
        return {"status": "error", "total": "Error", "total_recurrence": "Error", "lines": [], "recurrence_lines": [], "is_recursive": False}


@app.post("/api/run")
@app.post("/run")
def run_code(payload: CodePayload):
    old_stdout = sys.stdout                    # Save original stdout
    redirected_output = sys.stdout = StringIO()  # Redirect stdout to capture prints
    try:
        exec_globals = {}                     # Isolated namespace for code execution
        exec(payload.code, exec_globals)      # Execute user code
        output = redirected_output.getvalue() or "> Code ran successfully."
    except Exception as e:
        output = f"Runtime Error: {str(e)}"   # Capture runtime errors
    finally:
        sys.stdout = old_stdout                # Restore original stdout
    return {"status": "success", "output": output}


@app.post("/api/projects")
@app.post("/projects")
def save_project(project: ProjectModel):
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    project_dict = project.model_dump()         # Convert Pydantic model to dict
    result = projects_collection.insert_one(project_dict)  # Save in MongoDB
    return {"status": "success", "message": "Project saved!", "id": str(result.inserted_id)}


@app.get("/api/projects")
@app.get("/projects")
def get_projects():
    if projects_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    projects = list(projects_collection.find({}))  # Retrieve all projects from MongoDB
    for p in projects:
        p["_id"] = str(p["_id"])                 # Convert ObjectId to string for JSON serialization
    return {"status": "success", "projects": projects}
