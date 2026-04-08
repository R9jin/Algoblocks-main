import ast
import uuid

def gen_uid():
    return str(uuid.uuid4())[:15]

class BlocklyASTConverter:
    def __init__(self):
        # We must collect all variables to prevent Blockly's "Undeclared Variable" crash
        self.variables = set()

    def convert(self, code: str):
        self.variables = set()
        try:
            clean_code = code.replace('\xa0', ' ').replace('\u200b', '')
            tree = ast.parse(clean_code)
            first_block = self.serialize_body(tree.body)

            # Convert our collected variables into the strict format Blockly demands
            vars_array = [{"id": v, "name": v} for v in self.variables]

            if first_block:
                first_block["x"] = 20
                first_block["y"] = 20
                return {
                    "status": "success", 
                    "blocks": {
                        "variables": vars_array,
                        "blocks": {
                            "languageVersion": 0, 
                            "blocks": [first_block]
                        }
                    }
                }

            return {
                "status": "success", 
                "blocks": {
                    "variables": vars_array,
                    "blocks": {
                        "languageVersion": 0, 
                        "blocks": []
                    }
                }
            }

        except Exception as e:
            print("AST Parsing Error:", e)
            return self.raw_fallback(code)

    def raw_fallback(self, code):
        return {
            "status": "error",
            "blocks": {
                "blocks": {
                    "languageVersion": 0,
                    "blocks": [{
                        "type": "raw_python_multiline",
                        "id": gen_uid(),
                        "x": 20, "y": 20,
                        "fields": {"CODE": code}
                    }]
                }
            }
        }

    # ===============================
    # SAFE INPUT GENERATOR
    # Prevents fatal "null" JSON crashes
    # ===============================
    def add_input(self, block_dict, input_name, child_block):
        if child_block:
            if "inputs" not in block_dict:
                block_dict["inputs"] = {}
            block_dict["inputs"][input_name] = {"block": child_block}

    # ===============================
    # BODY SERIALIZATION
    # ===============================
    def serialize_body(self, nodes):
        if not nodes: return None
        first_block = None
        prev_block = None

        for node in nodes:
            block = self.serialize_node(node)

            if not block:
                block = self.make_raw_statement(node)
                
            if not block:
                continue

            if not first_block:
                first_block = block
            else:
                # Prevent crashing: Do not attach 'next' if the previous block is a function definition
                if prev_block.get("type") not in ["procedures_defnoreturn", "procedures_defreturn"]:
                    prev_block["next"] = {"block": block}

            # Only update prev_block if we can actually attach things to it
            # Otherwise, leave prev_block as it was so the NEXT line of code attaches 
            # to the block *above* the function (or sits separately)
            if block.get("type") not in ["procedures_defnoreturn", "procedures_defreturn"]:
                prev_block = block

    def make_raw_statement(self, node):
        try:
            code_str = ast.unparse(node) if hasattr(ast, 'unparse') else "Raw Code fallback"
            return {"type": "raw_python_statement", "id": gen_uid(), "fields": {"CODE": code_str}}
        except:
            return None

    def make_raw_expr(self, node):
        try:
            code_str = ast.unparse(node) if hasattr(ast, 'unparse') else "Raw Expr fallback"
            return {"type": "raw_python_expression", "id": gen_uid(), "fields": {"CODE": code_str}}
        except:
            return None

    # ===============================
    # EXPRESSIONS
    # ===============================
    def serialize_expr(self, node):
        if not node: return None
        try:
            if isinstance(node, ast.Constant):
                if isinstance(node.value, bool):
                    return {"type": "logic_boolean", "id": gen_uid(), "fields": {"BOOL": "TRUE" if node.value else "FALSE"}}
                elif isinstance(node.value, (int, float)):
                    return {"type": "math_number", "id": gen_uid(), "fields": {"NUM": node.value}}
                elif isinstance(node.value, str):
                    return {"type": "text", "id": gen_uid(), "fields": {"TEXT": node.value}}
            
            elif type(node).__name__ == 'Str':
                return {"type": "text", "id": gen_uid(), "fields": {"TEXT": node.s}}
            elif type(node).__name__ == 'Num':
                return {"type": "math_number", "id": gen_uid(), "fields": {"NUM": node.n}}
            elif type(node).__name__ == 'NameConstant':
                return {"type": "logic_boolean", "id": gen_uid(), "fields": {"BOOL": "TRUE" if node.value else "FALSE"}}

            elif isinstance(node, ast.Name):
                self.variables.add(node.id) # Register variable
                return {"type": "variables_get", "id": gen_uid(), "fields": {"VAR": {"id": node.id, "name": node.id}}}

            elif isinstance(node, ast.Dict):
                if not node.keys: return {"type": "dict_create_empty", "id": gen_uid()}
                pairs = []
                for k, v in zip(node.keys, node.values):
                    pair = {"type": "dict_pair", "id": gen_uid()}
                    self.add_input(pair, "KEY", self.serialize_expr(k))
                    self.add_input(pair, "VALUE", self.serialize_expr(v))
                    pairs.append(pair)
                
                list_block = {"type": "lists_create_with", "id": gen_uid(), "extraState": {"itemCount": len(pairs)}}
                for i, p in enumerate(pairs):
                    self.add_input(list_block, f"ADD{i}", p)
                    
                dict_block = {"type": "dict_from_pairs", "id": gen_uid()}
                self.add_input(dict_block, "LIST", list_block)
                return dict_block

            elif isinstance(node, ast.Subscript):
                slice_val = node.slice.value if type(node.slice).__name__ == 'Index' else node.slice
                block = {"type": "dict_get", "id": gen_uid()}
                self.add_input(block, "DICT", self.serialize_expr(node.value))
                self.add_input(block, "KEY", self.serialize_expr(slice_val))
                return block

            elif isinstance(node, ast.BinOp):
                arith_map = {ast.Add: "ADD", ast.Sub: "MINUS", ast.Mult: "MULTIPLY", ast.Div: "DIVIDE"}
                adv_map = {ast.FloorDiv: "FLOOR_DIV", ast.Pow: "POWER", ast.LShift: "LSHIFT", ast.RShift: "RSHIFT", ast.BitAnd: "BIT_AND", ast.BitOr: "BIT_OR"}
                
                if type(node.op) in arith_map:
                    block = {"type": "math_arithmetic", "id": gen_uid(), "fields": {"OP": arith_map[type(node.op)]}}
                elif type(node.op) in adv_map:
                    block = {"type": "math_advanced_operators", "id": gen_uid(), "fields": {"OP": adv_map[type(node.op)]}}
                else:
                    return self.make_raw_expr(node)

                self.add_input(block, "A", self.serialize_expr(node.left))
                self.add_input(block, "B", self.serialize_expr(node.right))
                return block

            elif isinstance(node, ast.Compare):
                if len(node.ops) == 1:
                    block = {"type": "logic_compare", "id": gen_uid(), "fields": {"OP": self.map_compare(node.ops[0])}}
                    self.add_input(block, "A", self.serialize_expr(node.left))
                    self.add_input(block, "B", self.serialize_expr(node.comparators[0]))
                    return block
                return self.make_raw_expr(node)

            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute) and node.func.attr == "join":
                    block = {"type": "custom_string_join", "id": gen_uid()}
                    self.add_input(block, "DELIMITER", self.serialize_expr(node.func.value))
                    self.add_input(block, "LIST", self.serialize_expr(node.args[0]))
                    return block

                if isinstance(node.func, ast.Name):
                    name = node.func.id
                    if name == "len":
                        block = {"type": "lists_length", "id": gen_uid()}
                        self.add_input(block, "VALUE", self.serialize_expr(node.args[0]))
                        return block
                    elif name in ["min", "max"]:
                        block = {"type": "math_min_max", "id": gen_uid(), "fields": {"OP": name.upper()}}
                        self.add_input(block, "A", self.serialize_expr(node.args[0]))
                        if len(node.args) > 1:
                            self.add_input(block, "B", self.serialize_expr(node.args[1]))
                        return block
                    elif name == "int":
                        block = {"type": "type_cast_int", "id": gen_uid()}
                        if node.args: self.add_input(block, "VALUE", self.serialize_expr(node.args[0]))
                        return block
                    elif name == "list":
                        block = {"type": "string_to_list", "id": gen_uid()}
                        if node.args: self.add_input(block, "STRING", self.serialize_expr(node.args[0]))
                        return block
                    
                    block = {"type": "procedures_callreturn", "id": gen_uid(), "extraState": {"name": name}}
                    for i, arg in enumerate(node.args):
                        self.add_input(block, f"ARG{i}", self.serialize_expr(arg))
                    return block

        except Exception:
            pass
        return self.make_raw_expr(node)

    def map_compare(self, op):
        return {ast.Eq: "EQ", ast.NotEq: "NEQ", ast.Lt: "LT", ast.LtE: "LTE", ast.Gt: "GT", ast.GtE: "GTE"}.get(type(op), "EQ")

    # ===============================
    # STATEMENTS
    # ===============================
    def serialize_node(self, node):
        try:
            if isinstance(node, ast.Assign):
                target = node.targets[0]
                if isinstance(target, ast.Name):
                    self.variables.add(target.id) # Register variable
                    block = {"type": "variables_set", "id": gen_uid(), "fields": {"VAR": {"id": target.id, "name": target.id}}}
                    self.add_input(block, "VALUE", self.serialize_expr(node.value))
                    return block
                    
                elif isinstance(target, ast.Subscript):
                    slice_val = target.slice.value if type(target.slice).__name__ == 'Index' else target.slice
                    block = {"type": "dict_set", "id": gen_uid()}
                    self.add_input(block, "DICT", self.serialize_expr(target.value))
                    self.add_input(block, "KEY", self.serialize_expr(slice_val))
                    self.add_input(block, "VALUE", self.serialize_expr(node.value))
                    return block

            elif isinstance(node, ast.AugAssign):
                op_map = {ast.Add: "ADD", ast.Sub: "MINUS", ast.Mult: "MULTIPLY", ast.Div: "DIVIDE"}
                if type(node.op) in op_map and isinstance(node.target, ast.Name):
                    self.variables.add(node.target.id) # Register variable
                    block = {"type": "math_assignment", "id": gen_uid(), "fields": {"VAR": {"id": node.target.id, "name": node.target.id}, "OP": op_map[type(node.op)]}}
                    self.add_input(block, "DELTA", self.serialize_expr(node.value))
                    return block

            elif isinstance(node, ast.If):
                block = {"type": "controls_if", "id": gen_uid()}
                self.add_input(block, "IF0", self.serialize_expr(node.test))
                self.add_input(block, "DO0", self.serialize_body(node.body))
                if node.orelse:
                    block["extraState"] = {"hasElse": True}
                    self.add_input(block, "ELSE", self.serialize_body(node.orelse))
                return block

            elif isinstance(node, ast.While):
                block = {"type": "controls_whileUntil", "id": gen_uid(), "fields": {"MODE": "WHILE"}}
                self.add_input(block, "BOOL", self.serialize_expr(node.test))
                self.add_input(block, "DO", self.serialize_body(node.body))
                return block

            elif isinstance(node, ast.For):
                if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                    args = node.iter.args
                    start = args[0] if len(args) > 1 else ast.parse("0").body[0].value
                    stop = args[1] if len(args) > 1 else args[0]
                    step = args[2] if len(args) > 2 else ast.parse("1").body[0].value

                    target_id = node.target.id if isinstance(node.target, ast.Name) else "i"
                    self.variables.add(target_id) # Register variable
                    
                    block = {"type": "controls_for", "id": gen_uid(), "fields": {"VAR": {"id": target_id, "name": target_id}}}
                    self.add_input(block, "FROM", self.serialize_expr(start))
                    self.add_input(block, "TO", self.serialize_expr(stop))
                    self.add_input(block, "BY", self.serialize_expr(step))
                    self.add_input(block, "DO", self.serialize_body(node.body))
                    return block
                return self.make_raw_statement(node)

            elif isinstance(node, ast.Return):
                block = {"type": "procedure_return_value", "id": gen_uid()}
                if node.value:
                    self.add_input(block, "VALUE", self.serialize_expr(node.value))
                return block

            elif isinstance(node, ast.FunctionDef):
                block = {"type": "procedures_defnoreturn", "id": gen_uid(), "fields": {"NAME": node.name}}
                self.add_input(block, "STACK", self.serialize_body(node.body))
                return block

            elif isinstance(node, ast.Expr):
                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    return {"type": "multi_line_comment", "id": gen_uid(), "fields": {"TEXT": node.value.value}}
                elif type(node.value).__name__ == 'Str':
                    return {"type": "multi_line_comment", "id": gen_uid(), "fields": {"TEXT": node.value.s}}
                elif isinstance(node.value, ast.Call) and getattr(node.value.func, 'id', '') == "print":
                    block = {"type": "text_print", "id": gen_uid()}
                    if node.value.args:
                        self.add_input(block, "TEXT", self.serialize_expr(node.value.args[0]))
                    return block
                return self.make_raw_statement(node)

        except Exception as e:
            pass
        return None