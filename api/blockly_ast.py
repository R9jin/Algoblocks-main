import ast
import uuid


def gen_uid():
    return str(uuid.uuid4())[:15]


class BlocklyASTConverter:
    def __init__(self):
        self.variables = set()

    def convert(self, code: str):
        self.variables = set()
        try:
            # Clean invisible characters and non-breaking spaces
            clean_code = (
                code.replace('\xa0', ' ')
                .replace('\u200b', '')
                .replace('\t', '    ')
            )
            tree = ast.parse(clean_code)

            top_blocks = []
            current_chain_head = None
            current_chain_tail = None
            y_offset = 20

            for node in tree.body:
                block = self.serialize_node(node)

                if not block:
                    block = self.make_raw_statement(node)
                if not block:
                    continue

                if block.get("type") in [
                    "procedures_defnoreturn",
                    "procedures_defreturn"
                ]:
                    block["x"] = 20
                    block["y"] = y_offset
                    top_blocks.append(block)

                    y_offset += 150
                    current_chain_head = None
                    current_chain_tail = None
                else:
                    if not current_chain_head:
                        block["x"] = 20
                        block["y"] = y_offset

                        current_chain_head = block
                        top_blocks.append(current_chain_head)
                        current_chain_tail = block

                        y_offset += 100
                    else:
                        current_chain_tail["next"] = {"block": block}
                        current_chain_tail = block

            vars_array = [{"id": v, "name": v} for v in self.variables]

            return {
                "status": "success",
                "blocks": {
                    "variables": vars_array,
                    "blocks": {
                        "languageVersion": 0,
                        "blocks": top_blocks
                    }
                }
            }

        except Exception:
            # fallback to raw block
            return self.raw_fallback(code)

    def raw_fallback(self, code):
        return {
            "status": "success",
            "blocks": {
                "blocks": {
                    "languageVersion": 0,
                    "blocks": [
                        {
                            "type": "raw_python_multiline",
                            "id": gen_uid(),
                            "x": 20,
                            "y": 20,
                            "fields": {"CODE": code}
                        }
                    ]
                }
            }
        }

    def add_input(self, block_dict, input_name, child_block):
        if child_block:
            if "inputs" not in block_dict:
                block_dict["inputs"] = {}

            block_dict["inputs"][input_name] = {"block": child_block}

    def serialize_body(self, nodes):
        if not nodes:
            return None

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
                if prev_block and prev_block.get("type") not in [
                    "procedures_defnoreturn",
                    "procedures_defreturn"
                ]:
                    prev_block["next"] = {"block": block}

            if block.get("type") not in [
                "procedures_defnoreturn",
                "procedures_defreturn"
            ]:
                prev_block = block

        return first_block

    def make_raw_statement(self, node):
        try:
            return {
                "type": "raw_python_statement",
                "id": gen_uid(),
                "fields": {"CODE": ast.unparse(node)}
            }
        except Exception:
            return None

    def make_raw_expr(self, node):
        try:
            return {
                "type": "raw_python_expression",
                "id": gen_uid(),
                "fields": {"CODE": ast.unparse(node)}
            }
        except Exception:
            return None

    def serialize_expr(self, node):
        if not node:
            return None

        try:
            if isinstance(node, ast.Constant):
                if isinstance(node.value, bool):
                    return {
                        "type": "logic_boolean",
                        "id": gen_uid(),
                        "fields": {
                            "BOOL": "TRUE" if node.value else "FALSE"
                        }
                    }

                elif isinstance(node.value, (int, float)):
                    return {
                        "type": "math_number",
                        "id": gen_uid(),
                        "fields": {"NUM": node.value}
                    }

                elif isinstance(node.value, str):
                    return {
                        "type": "text",
                        "id": gen_uid(),
                        "fields": {"TEXT": node.value}
                    }

            elif isinstance(node, ast.Name):
                self.variables.add(node.id)

                return {
                    "type": "variables_get",
                    "id": gen_uid(),
                    "fields": {
                        "VAR": {"id": node.id, "name": node.id}
                    }
                }

            elif isinstance(node, ast.BinOp):
                arith_map = {
                    ast.Add: "ADD",
                    ast.Sub: "MINUS",
                    ast.Mult: "MULTIPLY",
                    ast.Div: "DIVIDE"
                }

                if type(node.op) in arith_map:
                    block = {
                        "type": "math_arithmetic",
                        "id": gen_uid(),
                        "fields": {
                            "OP": arith_map[type(node.op)]
                        }
                    }

                    self.add_input(block, "A", self.serialize_expr(node.left))
                    self.add_input(block, "B", self.serialize_expr(node.right))

                    return block

            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    name = node.func.id
                    params = [f"arg{i}" for i in range(len(node.args))]

                    block = {
                        "type": "procedures_callreturn",
                        "id": gen_uid(),
                        "extraState": {
                            "name": name,
                            "params": params
                        }
                    }

                    for i, arg in enumerate(node.args):
                        self.add_input(
                            block,
                            f"ARG{i}",
                            self.serialize_expr(arg)
                        )

                    return block

        except Exception:
            pass

        return self.make_raw_expr(node)

    def serialize_node(self, node):
        try:
            if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
                var_name = node.targets[0].id
                self.variables.add(var_name)

                block = {
                    "type": "variables_set",
                    "id": gen_uid(),
                    "fields": {
                        "VAR": {"id": var_name, "name": var_name}
                    }
                }

                self.add_input(block, "VALUE", self.serialize_expr(node.value))
                return block

            elif isinstance(node, ast.FunctionDef):
                has_ret = any(isinstance(n, ast.Return) for n in ast.walk(node))

                block = {
                    "type": "procedures_defreturn" if has_ret else "procedures_defnoreturn",
                    "id": gen_uid(),
                    "fields": {"NAME": node.name}
                }

                params = [
                    {"name": a.arg, "id": a.arg}
                    for a in node.args.args
                ]

                for p in params:
                    self.variables.add(p["id"])

                if params:
                    block["extraState"] = {"params": params}

                self.add_input(block, "STACK", self.serialize_body(node.body))
                return block

            elif isinstance(node, ast.If):
                block = {
                    "type": "controls_if",
                    "id": gen_uid()
                }

                self.add_input(block, "IF0", self.serialize_expr(node.test))
                self.add_input(block, "DO0", self.serialize_body(node.body))

                if node.orelse:
                    block["extraState"] = {"hasElse": True}
                    self.add_input(block, "ELSE", self.serialize_body(node.orelse))

                return block

            elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
                if isinstance(node.value.func, ast.Name):
                    name = node.value.func.id

                    if name == "print":
                        block = {
                            "type": "text_print",
                            "id": gen_uid()
                        }

                        if node.value.args:
                            self.add_input(
                                block,
                                "TEXT",
                                self.serialize_expr(node.value.args[0])
                            )

                        return block

                    # standalone call (no return)
                    params = [f"arg{i}" for i in range(len(node.value.args))]

                    block = {
                        "type": "procedures_callnoreturn",
                        "id": gen_uid(),
                        "extraState": {
                            "name": name,
                            "params": params
                        }
                    }

                    for i, arg in enumerate(node.value.args):
                        self.add_input(
                            block,
                            f"ARG{i}",
                            self.serialize_expr(arg)
                        )

                    return block

        except Exception:
            pass

        return None