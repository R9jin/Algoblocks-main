import ast
import uuid

def gen_uid():
    return str(uuid.uuid4())[:15]


class BlocklyASTConverter:

    def convert(self, code: str):
        try:
            # CRITICAL FIX: Sanitize non-breaking spaces from GeeksforGeeks and zero-width spaces
            clean_code = code.replace('\xa0', ' ').replace('\u200b', '')
            
            tree = ast.parse(clean_code)
            first_block = self.serialize_body(tree.body)

            if first_block:
                first_block["x"] = 20
                first_block["y"] = 20
                return {
                    "status": "success", 
                    "blocks": {
                        "blocks": {
                            "languageVersion": 0, 
                            "blocks": [first_block]
                        }
                    }
                }

            return {
                "status": "success", 
                "blocks": {
                    "blocks": {
                        "languageVersion": 0, 
                        "blocks": []
                    }
                }
            }

        except Exception as e:
            print("AST Parsing Error:", e)
            # Make sure we use the original code in the fallback so the user doesn't lose data
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
    # BODY SERIALIZATION
    # ===============================
    def serialize_body(self, nodes):
        if not nodes:
            return None

        first_block = None
        prev_block = None

        for node in nodes:
            block = self.serialize_node(node)

            if not block:
                block = self.make_raw_statement(node)
                
            # Failsafe: if even raw_statement fails, skip it so the whole app doesn't crash
            if not block:
                continue

            if not first_block:
                first_block = block
            else:
                prev_block["next"] = {"block": block}

            prev_block = block

        return first_block

    def make_raw_statement(self, node):
        try:
            code_str = ast.unparse(node) if hasattr(ast, 'unparse') else "Raw Code fallback"
            return {
                "type": "raw_python_statement",
                "id": gen_uid(),
                "fields": {"CODE": code_str}
            }
        except:
            return None

    def make_raw_expr(self, node):
        try:
            code_str = ast.unparse(node) if hasattr(ast, 'unparse') else "Raw Expr fallback"
            return {
                "type": "raw_python_expression",
                "id": gen_uid(),
                "fields": {"CODE": code_str}
            }
        except:
            return None

    # ===============================
    # EXPRESSIONS
    # ===============================
    def serialize_expr(self, node):
        if not node:
            return None

        try:
            # Constants & Variables...
            if isinstance(node, ast.Constant):
                if isinstance(node.value, bool):
                    return {"type": "logic_boolean", "id": gen_uid(), "fields": {"BOOL": "TRUE" if node.value else "FALSE"}}
                elif isinstance(node.value, (int, float)):
                    return {"type": "math_number", "id": gen_uid(), "fields": {"NUM": node.value}}
                elif isinstance(node.value, str):
                    return {"type": "text", "id": gen_uid(), "fields": {"TEXT": node.value}}
            
            # --- CRITICAL FIX: Support for Python 3.7 and older ---
            elif type(node).__name__ == 'Str':
                return {"type": "text", "id": gen_uid(), "fields": {"TEXT": node.s}}
            elif type(node).__name__ == 'Num':
                return {"type": "math_number", "id": gen_uid(), "fields": {"NUM": node.n}}
            elif type(node).__name__ == 'NameConstant':
                return {"type": "logic_boolean", "id": gen_uid(), "fields": {"BOOL": "TRUE" if node.value else "FALSE"}}

            elif isinstance(node, ast.Name):
                return {"type": "variables_get", "id": gen_uid(), "fields": {"VAR": {"id": node.id, "name": node.id}}}

            # Dictionaries (Empty dict check)
            elif isinstance(node, ast.Dict):
                if not node.keys:
                    return {"type": "dict_create_empty", "id": gen_uid()}
                
                pairs = []
                for k, v in zip(node.keys, node.values):
                    pairs.append({
                        "type": "dict_pair",
                        "id": gen_uid(),
                        "inputs": {
                            "KEY": {"block": self.serialize_expr(k)},
                            "VALUE": {"block": self.serialize_expr(v)}
                        }
                    })
                return {
                    "type": "dict_from_pairs",
                    "id": gen_uid(),
                    "inputs": {
                        "LIST": {
                            "block": {
                                "type": "lists_create_with",
                                "id": gen_uid(),
                                "extraState": {"itemCount": len(pairs)},
                                "inputs": {f"ADD{i}": {"block": p} for i, p in enumerate(pairs)}
                            }
                        }
                    }
                }

            # Dictionary / List Getter
            elif isinstance(node, ast.Subscript):
                slice_val = node.slice.value if hasattr(node.slice, 'value') else node.slice
                return {
                    "type": "dict_get",
                    "id": gen_uid(),
                    "inputs": {
                        "DICT": {"block": self.serialize_expr(node.value)},
                        "KEY": {"block": self.serialize_expr(slice_val)}
                    }
                }

            # Binary & Bitwise Math Operations
            elif isinstance(node, ast.BinOp):
                arithmetic_map = {ast.Add: "ADD", ast.Sub: "MINUS", ast.Mult: "MULTIPLY", ast.Div: "DIVIDE"}
                advanced_map = {
                    ast.FloorDiv: "FLOOR_DIV", ast.Pow: "POWER",
                    ast.LShift: "LSHIFT", ast.RShift: "RSHIFT",
                    ast.BitAnd: "BIT_AND", ast.BitOr: "BIT_OR"
                }
                
                if type(node.op) in arithmetic_map:
                    return {
                        "type": "math_arithmetic",
                        "id": gen_uid(),
                        "fields": {"OP": arithmetic_map[type(node.op)]},
                        "inputs": {
                            "A": {"block": self.serialize_expr(node.left)},
                            "B": {"block": self.serialize_expr(node.right)}
                        }
                    }
                elif type(node.op) in advanced_map:
                    return {
                        "type": "math_advanced_operators",
                        "id": gen_uid(),
                        "fields": {"OP": advanced_map[type(node.op)]},
                        "inputs": {
                            "A": {"block": self.serialize_expr(node.left)},
                            "B": {"block": self.serialize_expr(node.right)}
                        }
                    }

            elif isinstance(node, ast.Compare):
                if len(node.ops) == 1:
                    return {
                        "type": "logic_compare",
                        "id": gen_uid(),
                        "fields": {"OP": self.map_compare(node.ops[0])},
                        "inputs": {
                            "A": {"block": self.serialize_expr(node.left)},
                            "B": {"block": self.serialize_expr(node.comparators[0])}
                        }
                    }
                return self.make_raw_expr(node)

            # Function Calls & Builtins
            elif isinstance(node, ast.Call):
                # Handle 'string'.join(list) -> custom_string_join
                if isinstance(node.func, ast.Attribute) and node.func.attr == "join":
                    return {
                        "type": "custom_string_join",
                        "id": gen_uid(),
                        "inputs": {
                            "DELIMITER": {"block": self.serialize_expr(node.func.value)},
                            "LIST": {"block": self.serialize_expr(node.args[0])}
                        }
                    }

                if isinstance(node.func, ast.Name):
                    name = node.func.id
                    if name == "len":
                        return {"type": "lists_length", "id": gen_uid(), "inputs": {"VALUE": {"block": self.serialize_expr(node.args[0])}}}
                    elif name in ["min", "max"]:
                        return {
                            "type": "math_min_max",
                            "id": gen_uid(),
                            "fields": {"OP": name.upper()},
                            "inputs": {
                                "A": {"block": self.serialize_expr(node.args[0])},
                                "B": {"block": self.serialize_expr(node.args[1])} if len(node.args) > 1 else None
                            }
                        }
                    elif name == "int":
                        return {"type": "type_cast_int", "id": gen_uid(), "inputs": {"VALUE": {"block": self.serialize_expr(node.args[0])}}}
                    elif name == "list":
                        return {"type": "string_to_list", "id": gen_uid(), "inputs": {"STRING": {"block": self.serialize_expr(node.args[0])}}}
                    
                    # Standard User Procedures
                    block = {
                        "type": "procedures_callreturn",
                        "id": gen_uid(),
                        "extraState": {"name": name},
                        "inputs": {}
                    }
                    for i, arg in enumerate(node.args):
                        block["inputs"][f"ARG{i}"] = {"block": self.serialize_expr(arg)}
                    return block

        except Exception:
            pass

        return self.make_raw_expr(node)

    def map_compare(self, op):
        return {
            ast.Eq: "EQ",
            ast.NotEq: "NEQ",
            ast.Lt: "LT",
            ast.LtE: "LTE",
            ast.Gt: "GT",
            ast.GtE: "GTE"
        }.get(type(op), "EQ")

    # ===============================
    # STATEMENTS
    # ===============================
    def serialize_node(self, node):
        try:
            # ---------- ASSIGN & DICTIONARY SET ----------
            if isinstance(node, ast.Assign):
                target = node.targets[0]
                if isinstance(target, ast.Name):
                    block = {
                        "type": "variables_set",
                        "id": gen_uid(),
                        "fields": {"VAR": {"id": target.id, "name": target.id}},
                        "inputs": {}
                    }
                    val_block = self.serialize_expr(node.value)
                    if val_block:
                        block["inputs"]["VALUE"] = {"block": val_block}
                    return block
                    
                # Handle Dictionary/List Assignment (e.g., dict['key'] = value)
                elif isinstance(target, ast.Subscript):
                    slice_val = target.slice.value if hasattr(target.slice, 'value') else target.slice
                    return {
                        "type": "dict_set",
                        "id": gen_uid(),
                        "inputs": {
                            "DICT": {"block": self.serialize_expr(target.value)},
                            "KEY": {"block": self.serialize_expr(slice_val)},
                            "VALUE": {"block": self.serialize_expr(node.value)}
                        }
                    }

            # ---------- AUGMENTED ASSIGN (+=, -=, *=, /=) ----------
            elif isinstance(node, ast.AugAssign):
                op_map = {ast.Add: "ADD", ast.Sub: "MINUS", ast.Mult: "MULTIPLY", ast.Div: "DIVIDE"}
                if type(node.op) in op_map and isinstance(node.target, ast.Name):
                    return {
                        "type": "math_assignment",
                        "id": gen_uid(),
                        "fields": {
                            "VAR": {"id": node.target.id, "name": node.target.id},
                            "OP": op_map[type(node.op)]
                        },
                        "inputs": {
                            "DELTA": {"block": self.serialize_expr(node.value)}
                        }
                    }

            # ---------- IF ----------
            elif isinstance(node, ast.If):
                block = {
                    "type": "controls_if",
                    "id": gen_uid(),
                    "inputs": {}
                }
                test_block = self.serialize_expr(node.test)
                do_block = self.serialize_body(node.body)
                
                if test_block: block["inputs"]["IF0"] = {"block": test_block}
                if do_block: block["inputs"]["DO0"] = {"block": do_block}
                
                if node.orelse:
                    else_block = self.serialize_body(node.orelse)
                    if else_block:
                        block["extraState"] = {"hasElse": True}
                        block["inputs"]["ELSE"] = {"block": else_block}
                return block

            # ---------- WHILE ----------
            elif isinstance(node, ast.While):
                block = {
                    "type": "controls_whileUntil",
                    "id": gen_uid(),
                    "fields": {"MODE": "WHILE"},
                    "inputs": {}
                }
                test_block = self.serialize_expr(node.test)
                do_block = self.serialize_body(node.body)
                
                if test_block: block["inputs"]["BOOL"] = {"block": test_block}
                if do_block: block["inputs"]["DO"] = {"block": do_block}
                return block

            # ---------- FOR ----------
            elif isinstance(node, ast.For):
                if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                    args = node.iter.args
                    start = args[0] if len(args) > 1 else ast.Constant(value=0)
                    stop = args[1] if len(args) > 1 else args[0]
                    step = args[2] if len(args) > 2 else ast.Constant(value=1)

                    return {
                        "type": "controls_for",
                        "id": gen_uid(),
                        "fields": {"VAR": node.target.id},
                        "inputs": {
                            "FROM": {"block": self.serialize_expr(start)},
                            "TO": {"block": self.serialize_expr(stop)},
                            "BY": {"block": self.serialize_expr(step)},
                            "DO": {"block": self.serialize_body(node.body)}
                        }
                    }
                return self.make_raw_statement(node)

            # ---------- RETURN ----------
            elif isinstance(node, ast.Return):
                block = {"type": "procedure_return_value", "id": gen_uid()}
                if node.value:
                    val_block = self.serialize_expr(node.value)
                    if val_block:
                        block["inputs"] = {"VALUE": {"block": val_block}}
                return block

            # ---------- FUNCTION ----------
            elif isinstance(node, ast.FunctionDef):
                return {
                    "type": "procedures_defnoreturn",
                    "id": gen_uid(),
                    "fields": {"NAME": node.name},
                    "inputs": {
                        "STACK": {"block": self.serialize_body(node.body)}
                    }
                }

            # ---------- EXPRESSIONS (Print & Comments) ----------
            elif isinstance(node, ast.Expr):
                # 1. Multi-line comment / Docstring (Python 3.8+)
                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    return {
                        "type": "multi_line_comment",
                        "id": gen_uid(),
                        "fields": {"TEXT": node.value.value}
                    }
                # Legacy Docstring support (Python < 3.8)
                elif type(node.value).__name__ == 'Str':
                    return {
                        "type": "multi_line_comment",
                        "id": gen_uid(),
                        "fields": {"TEXT": node.value.s}
                    }
                # 2. Print function call
                elif isinstance(node.value, ast.Call) and getattr(node.value.func, 'id', '') == "print":
                    block = {"type": "text_print", "id": gen_uid()}
                    if node.value.args:
                        expr_block = self.serialize_expr(node.value.args[0])
                        # Safely assign the input only if the expression successfully parsed
                        if expr_block:
                            block["inputs"] = {"TEXT": {"block": expr_block}}
                    return block
                else:
                    return self.make_raw_statement(node)

        except Exception as e:
            pass

        return None