import * as Blockly from "blockly";
import "blockly/blocks";
import * as En from "blockly/msg/en";
import { pythonGenerator } from "blockly/python";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// --- STABLE PLUGIN IMPORTS ---
import { Modal } from "@blockly/plugin-modal";
import { WorkspaceSearch } from "@blockly/plugin-workspace-search";
import { shadowBlockConversionChangeListener } from "@blockly/shadow-block-converter";
import DarkTheme from "@blockly/theme-dark";
import ModernTheme from "@blockly/theme-modern";
import "@blockly/toolbox-search";
import { Backpack } from "@blockly/workspace-backpack";
import { ContentHighlight } from "@blockly/workspace-content-highlight";
import { PositionedMinimap } from "@blockly/workspace-minimap";
import { ZoomToFitControl } from "@blockly/zoom-to-fit";

Blockly.setLocale(En);

// --- 1. DEFINE CUSTOM BLOCKS ---
const customBlocks = [
  {
    "type": "comment_block",
    "message0": "Comment %1",
    "args0": [{ "type": "field_input", "name": "TEXT", "text": "write note here" }],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#999999",
    "tooltip": "Adds a comment to the Python code",
  },
  {
    "type": "math_assignment",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "field_variable", "name": "VAR", "variable": "item" },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [ ["+=", "ADD"], ["-=", "MINUS"], ["*=", "MULTIPLY"], ["/=", "DIVIDE"] ]
      },
      { "type": "input_value", "name": "DELTA", "check": "Number" }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Modify a variable (Add, Subtract, Multiply, Divide).",
  }
];

if (Blockly.common && Blockly.common.defineBlocksWithJsonArray) {
  Blockly.common.defineBlocksWithJsonArray(customBlocks);
} else {
  Blockly.defineBlocksWithJsonArray(customBlocks);
}

// --- 2. TOOLBOX CONFIGURATION ---
const toolbox = {
  kind: "categoryToolbox",
  contents: [
    { kind: "search", name: "Search", contents: [] },
    {
      kind: "category",
      name: "Logic",
      colour: "210",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_null" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      colour: "120",
      contents: [
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 10 } } }, BY: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "230",
      contents: [
        { kind: "block", type: "math_number", fields: { NUM: 123 } },
        { kind: "block", type: "math_arithmetic", inputs: { A: { shadow: { type: "math_number", fields: { NUM: 1 } } }, B: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "math_assignment", inputs: { DELTA: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_constant" },
        { kind: "block", type: "math_number_property" },
        { kind: "block", type: "math_round" },
        { kind: "block", type: "math_on_list" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_constrain", inputs: { LOW: { shadow: { type: "math_number", fields: { NUM: 1 } } }, HIGH: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
        { kind: "block", type: "math_random_int", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
        { kind: "block", type: "math_random_float" },
      ],
    },
    {
      kind: "category",
      name: "Text",
      colour: "160",
      contents: [
        { kind: "block", type: "comment_block" }, 
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_append" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_indexOf" },
        { kind: "block", type: "text_charAt" },
        { kind: "block", type: "text_getSubstring" },
        { kind: "block", type: "text_changeCase" },
        { kind: "block", type: "text_trim" },
        { kind: "block", type: "text_print" },
        { kind: "block", type: "text_prompt_ext", inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "abc" } } } } },
      ],
    },
    {
      kind: "category",
      name: "Lists",
      colour: "260",
      contents: [
        { kind: "block", type: "lists_create_with", extraState: { itemCount: 0 } },
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_repeat", inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 5 } } } } },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
        { kind: "block", type: "lists_getIndex" },
        { kind: "block", type: "lists_setIndex" },
        { kind: "block", type: "lists_getSublist" },
        { kind: "block", type: "lists_split" },
        { kind: "block", type: "lists_sort" },
      ],
    },
    { kind: "category", name: "Variables", colour: "330", custom: "VARIABLE" },
    { kind: "category", name: "Functions", colour: "290", custom: "PROCEDURE" },
  ],
};

const BlocklyWorkspace = forwardRef(({ onChange }, ref) => {
  const blocklyDiv = useRef(null);
  const workspace = useRef(null);
  const onChangeRef = useRef(onChange);

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (workspace.current) workspace.current.clear();
    },
    loadTemplate: (json) => {
      if (workspace.current) {
        Blockly.Events.disable(); 
        workspace.current.clear();
        Blockly.serialization.workspaces.load(json, workspace.current);
        Blockly.Events.enable(); 
        return pythonGenerator.workspaceToCode(workspace.current);
      }
      return "";
    },
    setTheme: (themeName) => {
      if (workspace.current) {
        workspace.current.setTheme(themeName === 'dark' ? DarkTheme : ModernTheme);
      }
    }
  }));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (workspace.current) return;

    if (blocklyDiv.current) {
      if (Blockly.ShortcutRegistry.registry.getRegistry()['startSearch']) {
        Blockly.ShortcutRegistry.registry.unregister('startSearch');
      }

      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolbox,
        trashcan: true,
        move: { scrollbars: true, drag: true, wheel: true },
        zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
        renderer: "geras", 
        theme: ModernTheme, 
      });

      try {
        new WorkspaceSearch(workspace.current).init();
        new ZoomToFitControl(workspace.current).init();
        new PositionedMinimap(workspace.current).init();
        new Modal(workspace.current).init();
        new Backpack(workspace.current).init();
        new ContentHighlight(workspace.current).init();
        workspace.current.addChangeListener(shadowBlockConversionChangeListener);
      } catch (e) {
        console.warn("Plugin init skipped:", e.message);
      }

      pythonGenerator.init = function(workspace) {
        this.variableDB_ = new Blockly.Names(this.RESERVED_WORDS_);
        this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
        this.nameDB_.setVariableMap(workspace.getVariableMap());
        this.definitions_ = Object.create(null);
        this.functionNames_ = Object.create(null);

        this.isInitialized = true;
      };

      pythonGenerator.finish = function(code) {
        const definitions = Object.values(this.definitions_);
        return definitions.join('\n\n') + '\n\n' + code;
      };

      pythonGenerator.forBlock['comment_block'] = function(block) {
        const text = block.getFieldValue('TEXT');
        return `# ${text}\n`;
      };

      // --- CRASH-PROOF MATH ASSIGNMENT ---
      pythonGenerator.forBlock['math_assignment'] = function(block) {
        const variable = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        const operator = block.getFieldValue('OP');
        const value = pythonGenerator.valueToCode(block, 'DELTA', pythonGenerator.ORDER_ATOMIC) || '0';
        
        let symbol = "+=";
        if (operator === "MINUS") symbol = "-=";
        else if (operator === "MULTIPLY") symbol = "*=";
        else if (operator === "DIVIDE") symbol = "/=";
        
        return `${variable} ${symbol} ${value}\n`;
      };

      // --- CRASH-PROOF CONTROLS_FOR (NO COMMA 1, CLEAN INDENTS) ---
      pythonGenerator.forBlock['controls_for'] = function(block) {
        const variable = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
        const from = pythonGenerator.valueToCode(block, 'FROM', pythonGenerator.ORDER_NONE) || '0';
        const to = pythonGenerator.valueToCode(block, 'TO', pythonGenerator.ORDER_NONE) || '0';
        const step = pythonGenerator.valueToCode(block, 'BY', pythonGenerator.ORDER_NONE) || '1';
        
        let rangeCode;
        if (step.trim() === '1') {
          if (from.trim() === '0') {
            rangeCode = `range(${to})`;
          } else {
            rangeCode = `range(${from}, ${to})`;
          }
        } else {
          rangeCode = `range(${from}, ${to}, ${step})`;
        }
        
        let branch = pythonGenerator.statementToCode(block, 'DO') || pythonGenerator.PASS;
        return `for ${variable} in ${rangeCode}:\n${branch}`;
      };

      pythonGenerator.forBlock['lists_getIndex'] = function(block) {
        const mode = block.getFieldValue('MODE') || 'GET';
        const where = block.getFieldValue('WHERE') || 'FROM_START';
        const listOrder = (where === 'RANDOM') ? pythonGenerator.ORDER_NONE : pythonGenerator.ORDER_MEMBER;
        const list = pythonGenerator.valueToCode(block, 'VALUE', listOrder) || '[]';

        if (where === 'FROM_START') {
          const at = pythonGenerator.valueToCode(block, 'AT', pythonGenerator.ORDER_NONE) || '0';
          return [list + '[' + at + ']', pythonGenerator.ORDER_MEMBER];
        }
        return [list, pythonGenerator.ORDER_MEMBER];
      };

      pythonGenerator.forBlock['lists_setIndex'] = function(block) {
        const list = pythonGenerator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
        const mode = block.getFieldValue('MODE') || 'SET';
        const where = block.getFieldValue('WHERE') || 'FROM_START';
        const value = pythonGenerator.valueToCode(block, 'TO', pythonGenerator.ORDER_NONE) || 'None';

        if (where === 'FROM_START') {
          const at = pythonGenerator.valueToCode(block, 'AT', pythonGenerator.ORDER_NONE) || '0';
          if (mode === 'SET') {
            return list + '[' + at + '] = ' + value + '\n';
          } else if (mode === 'INSERT') {
            return list + '.insert(' + at + ', ' + value + ')\n';
          }
        }
        return ''; 
      };

      workspace.current.addChangeListener((event) => {
        if (event.type === Blockly.Events.BLOCK_CREATE || 
            event.type === Blockly.Events.BLOCK_DELETE || 
            event.type === Blockly.Events.BLOCK_CHANGE || 
            event.type === Blockly.Events.BLOCK_MOVE) {
          const json = Blockly.serialization.workspaces.save(workspace.current);
          const code = pythonGenerator.workspaceToCode(workspace.current);
          if (onChangeRef.current) onChangeRef.current(json, code);
        }
      });
      
      const observer = new ResizeObserver(() => {
        if (workspace.current) Blockly.svgResize(workspace.current);
      });
      observer.observe(blocklyDiv.current);
      blocklyDiv.current.resizeObserver = observer;
    }

    return () => {
      if (workspace.current) {
        workspace.current.dispose();
        workspace.current = null;    
      }
      if (blocklyDiv.current?.resizeObserver) {
        blocklyDiv.current.resizeObserver.disconnect();
      }
    };
  }, []); 

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={blocklyDiv} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

export default BlocklyWorkspace;