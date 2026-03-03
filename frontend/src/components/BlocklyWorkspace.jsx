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

Blockly.setLocale(En);

// --- DEFINE CUSTOM PASTEL THEME ---
const pastelTheme = Blockly.Theme.defineTheme('pastelTheme', {
  base: ModernTheme,
  categoryStyles: {
    logic_category: { colour: "#c1a0e8" },
    loop_category: { colour: "#8bcf8b" },
    math_category: { colour: "#4C97FF" },
    text_category: { colour: "#d5a52a" },
    list_category: { colour: "#4DB6AC" },
    variable_category: { colour: "#f38286" },
    procedure_category: { colour: "#7a6b66" }
  },
  blockStyles: {
    logic_blocks: { colourPrimary: "#c1a0e8", colourSecondary: "#B8A0D6", colourTertiary: "#A38CC1" },
    loop_blocks: { colourPrimary: "#8bcf8b", colourSecondary: "#90BC90", colourTertiary: "#7CA77C" },
    math_blocks: { colourPrimary: "#4C97FF", colourSecondary: "#2c80f5", colourTertiary: "#2A70CC" },
    text_blocks: { colourPrimary: "#d5a52a", colourSecondary: "#E5AF2C", colourTertiary: "#CC9A26" },
    list_blocks: { colourPrimary: "#4DB6AC", colourSecondary: "#42A097", colourTertiary: "#388C83" },
    variable_blocks: { colourPrimary: "#f38286", colourSecondary: "#DB888B", colourTertiary: "#C27679" },
    procedure_blocks: { colourPrimary: "#7a6b66", colourSecondary: "#BDB2AE", colourTertiary: "#A89D9A" }
  },
  fontStyle: {
    family: "'Outfit', 'Inter', sans-serif", // Uses the fonts from your index.html
    weight: "500", // Makes the text slightly bolder/crisper
    size: 13       // Adjust the size to fit the blocks nicely
  }
});

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
    "colour": "#4C97FF",
    "tooltip": "Modify a variable (Add, Subtract, Multiply, Divide).",
  },
  {
    "type": "procedure_return_value",
    "message0": "return %1",
    "args0": [
      {
        "type": "input_value",
        "name": "VALUE"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#7a6b66", // Same color as Functions category
    "tooltip": "Returns the value from this function.",
    "helpUrl": ""
  },
  {
    "type": "custom_string_join",
    "message0": "join list %1 with delimiter %2",
    "args0": [
      { "type": "input_value", "name": "LIST", "check": "Array" },
      { "type": "input_value", "name": "DELIMITER", "check": "String" }
    ],
    "output": "String",
    "colour": "#d5a52a",
    "tooltip": "Joins a list of strings into one string using a delimiter.",
  },
  {
    "type": "string_to_list",
    "message0": "create list from string %1",
    "args0": [
      { "type": "input_value", "name": "STRING", "check": "String" }
    ],
    "output": "Array",
    "colour": "#4DB6AC", // Same color as standard List blocks
    "tooltip": "Converts a word/string into a list of its individual characters.",
  },
  {
    "type": "math_advanced_operators",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "input_value", "name": "A", "check": "Number" },
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["//", "FLOOR_DIV"],
          ["**", "POWER"],
          [">>", "RSHIFT"],
          ["<<", "LSHIFT"],
          ["&", "BIT_AND"],
          ["|", "BIT_OR"]
        ]
      },
      { "type": "input_value", "name": "B", "check": "Number" }
    ],
    "inputsInline": true,
    "output": "Number",
    "colour": "#4C97FF",
    "tooltip": "Advanced operators: Floor Division (//), Power (**), Bitwise Shifts (>>, <<), and Bitwise Logic (&, |)",
  },
  {
    "type": "type_cast_int",
    "message0": "int %1",
    "args0": [
      { "type": "input_value", "name": "VALUE" }
    ],
    "output": "Number",
    "colour": "#4C97FF", // Matches your Math category color
    "tooltip": "Converts a value or string to an integer.",
  },
  {
    "type": "math_min_max",
    "message0": "%1 of %2 and %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          ["max", "MAX"],
          ["min", "MIN"]
        ]
      },
      { "type": "input_value", "name": "A", "check": "Number" },
      { "type": "input_value", "name": "B", "check": "Number" }
    ],
    "inputsInline": true,
    "output": "Number",
    "colour": "#4C97FF", // Matches the Math category
    "tooltip": "Returns the minimum or maximum of two numbers.",
  },
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
      categorystyle: "logic_category", // Replaced colour
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_null" },
        { kind: "block", type: "logic_ternary" },
        { kind: "block", type: "procedure_return_value" } // your custom block
      ],
    },
    {
      kind: "category",
      name: "Loops",
      categorystyle: "loop_category", // Replaced colour
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
      categorystyle: "math_category", // Replaced colour
      contents: [
        { kind: "block", type: "math_number", fields: { NUM: 123 } },
        { kind: "block", type: "math_arithmetic", inputs: { A: { shadow: { type: "math_number", fields: { NUM: 1 } } }, B: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "math_advanced_operators" },
        { kind: "block", type: "math_assignment", inputs: { DELTA: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "type_cast_int" }, // <--- ADD IT HERE
        { kind: "block", type: "math_min_max" }, // <--- ADD IT HERE
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
      categorystyle: "text_category", // Replaced colour
      contents: [
        { kind: "block", type: "comment_block" }, 
        { kind: "block", type: "text" },
        { kind: "block", type: "custom_string_join" },
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
      categorystyle: "list_category", // Replaced colour
      contents: [
        { kind: "block", type: "string_to_list" }, 
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
    { kind: "category", name: "Variables", categorystyle: "variable_category", custom: "VARIABLE" },
    { kind: "category", name: "Functions", categorystyle: "procedure_category", custom: "PROCEDURE" },
  ],
};

const BlocklyWorkspace = forwardRef(({ onChange }, ref) => {
  const blocklyDiv = useRef(null);
  const workspace = useRef(null);
  const onChangeRef = useRef(onChange);
  
  // NEW: Add a flag to tell our listener when we are loading a template
  const isLoading = useRef(false); 

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (workspace.current) {
        isLoading.current = true;
        workspace.current.clear();
        isLoading.current = false;
      }
    },
    loadTemplate: (json) => {
      if (workspace.current) {
        // 1. Tell our change listener to ignore updates temporarily
        isLoading.current = true; 
        
        // 2. Clear and load WITHOUT disabling Blockly.Events!
        workspace.current.clear();
        Blockly.serialization.workspaces.load(json, workspace.current);
        
        // 3. Re-enable our listener
        isLoading.current = false; 
        
        // 4. Generate the code once everything is loaded and properly wired up
        setTimeout(() => {
          const code = pythonGenerator.workspaceToCode(workspace.current);
          const currentJson = Blockly.serialization.workspaces.save(workspace.current);
          if (onChangeRef.current) onChangeRef.current(currentJson, code);
        }, 100);

        return "";
      }
      return "";
    },
    setTheme: (themeName) => {
      if (workspace.current) {
        // Change ModernTheme to pastelTheme here
        workspace.current.setTheme(themeName === 'dark' ? DarkTheme : pastelTheme); 
      }
    }
  }));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

useEffect(() => {
    if (workspace.current) return;

    // Define plugin variables here so we can access them in the cleanup function
    let searchPlugin, minimapPlugin, modalPlugin, backpackPlugin, highlightPlugin;

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
        theme: pastelTheme, 
        grid: {
          spacing: 25,
          length: 3,
          colour: '#6e6e6e',
          snap: true
        }
      });

      try {
        // Instantiate plugins and keep references to them
        searchPlugin = new WorkspaceSearch(workspace.current);
        searchPlugin.init();
        
        minimapPlugin = new PositionedMinimap(workspace.current);
        minimapPlugin.init();
        
        modalPlugin = new Modal(workspace.current);
        modalPlugin.init();
        
        backpackPlugin = new Backpack(workspace.current);
        backpackPlugin.init();
        
        highlightPlugin = new ContentHighlight(workspace.current);
        highlightPlugin.init();
        
        workspace.current.addChangeListener(shadowBlockConversionChangeListener);
      } catch (e) {
        console.warn("Plugin init skipped:", e.message);
      }

      // Safely wrap the init function to preserve Blockly's internal tracking
      if (!pythonGenerator.__originalInit) {
        pythonGenerator.__originalInit = pythonGenerator.init;
        pythonGenerator.init = function(workspace) {
          pythonGenerator.__originalInit.call(this, workspace);
          if (this.definitions_['variables']) {
            delete this.definitions_['variables'];
          }
        };
      }

      if (!pythonGenerator.__originalFinish) {
        pythonGenerator.__originalFinish = pythonGenerator.finish;
        pythonGenerator.finish = function(code) {
          let finalCode = pythonGenerator.__originalFinish.call(this, code);
          
          // 1. Remove global variable declarations
          finalCode = finalCode.replace(/^[ \t]*global[ \t]+.*\n?/gm, '');
          
          // 2. Remove default docstring descriptions
          finalCode = finalCode.replace(/^[ \t]*"""Describe this function\.\.\."""\n?/gm, '');

          // 3. Remove default comment descriptions (# Describe this function...)
          finalCode = finalCode.replace(/^[ \t]*# Describe this function\.\.\.\n?/gm, '');
          
          return finalCode.trim();
        };
      }

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

      pythonGenerator.forBlock['procedure_return_value'] = function(block) {
        const value = pythonGenerator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_NONE) || 'None';
        return `return ${value}\n`;
      };

      pythonGenerator.forBlock['custom_string_join'] = function(block) {
        const list = pythonGenerator.valueToCode(block, 'LIST', pythonGenerator.ORDER_NONE) || '[]';
        const delimiter = pythonGenerator.valueToCode(block, 'DELIMITER', pythonGenerator.ORDER_MEMBER) || "''";
        const code = `${delimiter}.join(${list})`;
        return [code, pythonGenerator.ORDER_FUNCTION_CALL];
      };

      pythonGenerator.forBlock['string_to_list'] = function(block) {
        const stringVal = pythonGenerator.valueToCode(block, 'STRING', pythonGenerator.ORDER_NONE) || "''";
        const code = `list(${stringVal})`;
        return [code, pythonGenerator.ORDER_FUNCTION_CALL];
      };

      pythonGenerator.forBlock['type_cast_int'] = function(block) {
        const value = pythonGenerator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_NONE) || '0';
        return [`int(${value})`, pythonGenerator.ORDER_FUNCTION_CALL];
      };

      pythonGenerator.forBlock['math_advanced_operators'] = function(block) {
        const operator = block.getFieldValue('OP');
        
        let opSymbol = '';
        let order = pythonGenerator.ORDER_NONE;
        
        // 1. Determine the operator and its strict precedence level FIRST
        switch (operator) {
          case 'FLOOR_DIV':
            opSymbol = '//';
            order = pythonGenerator.ORDER_MULTIPLICATIVE;
            break;
          case 'POWER':
            opSymbol = '**';
            order = pythonGenerator.ORDER_EXPONENTIATION;
            break;
          case 'RSHIFT':
            opSymbol = '>>';
            order = pythonGenerator.ORDER_BITWISE_SHIFT;
            break;
          case 'LSHIFT':
            opSymbol = '<<';
            order = pythonGenerator.ORDER_BITWISE_SHIFT;
            break;
          case 'BIT_AND':
            opSymbol = '&';
            order = pythonGenerator.ORDER_BITWISE_AND;
            break;
          case 'BIT_OR':
            opSymbol = '|';
            order = pythonGenerator.ORDER_BITWISE_OR;
            break;
        }
        
        // 2. Pass the resolved 'order' so Blockly automatically adds ( ) when needed
        const a = pythonGenerator.valueToCode(block, 'A', order) || '0';
        const b = pythonGenerator.valueToCode(block, 'B', order) || '0';
        
        return [`${a} ${opSymbol} ${b}`, order];
      };

      pythonGenerator.forBlock['math_min_max'] = function(block) {
        const op = block.getFieldValue('OP') === 'MAX' ? 'max' : 'min';
        
        // Pass ORDER_NONE because max() and min() are function calls that encapsulate their arguments
        const a = pythonGenerator.valueToCode(block, 'A', pythonGenerator.ORDER_NONE) || '0';
        const b = pythonGenerator.valueToCode(block, 'B', pythonGenerator.ORDER_NONE) || '0';
        
        const code = `${op}(${a}, ${b})`;
        return [code, pythonGenerator.ORDER_FUNCTION_CALL];
      };

      pythonGenerator.forBlock['comment_block'] = function(block) {
        // Fetch the text typed into the block
        const text = block.getFieldValue('TEXT') || '';
        
        // Return it formatted as a Python comment
        return `# ${text}\n`;
      };

      workspace.current.addChangeListener((event) => {
        if (isLoading.current) return;
        if (event.isUiEvent) return;

        try {
          const json = Blockly.serialization.workspaces.save(workspace.current);
          const code = pythonGenerator.workspaceToCode(workspace.current);
          if (onChangeRef.current) onChangeRef.current(json, code);
        } catch (e) {
          console.warn("Blockly Workspace Update Error: ", e);
        }
      });
      
      const observer = new ResizeObserver(() => {
        if (workspace.current) Blockly.svgResize(workspace.current);
      });
      observer.observe(blocklyDiv.current);
      blocklyDiv.current.resizeObserver = observer;
    }

    return () => {
      // Gracefully dispose of all plugins so elements like the minimap don't duplicate
      try {
        if (searchPlugin && typeof searchPlugin.dispose === 'function') searchPlugin.dispose();
        if (minimapPlugin && typeof minimapPlugin.dispose === 'function') minimapPlugin.dispose();
        if (modalPlugin && typeof modalPlugin.dispose === 'function') modalPlugin.dispose();
        if (backpackPlugin && typeof backpackPlugin.dispose === 'function') backpackPlugin.dispose();
        if (highlightPlugin && typeof highlightPlugin.dispose === 'function') highlightPlugin.dispose();
      } catch (e) {
        console.warn("Plugin dispose skipped:", e.message);
      }

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