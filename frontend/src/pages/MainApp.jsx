import { useRef, useState } from "react";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace";

export default function MainApp() {
  const [analysisResult, setAnalysisResult] = useState({ lines: [], total: "O(1)" });
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  const workspaceRef = useRef(null);

  const handleBlocklyChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    setBlocklyJson(json);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pythonCode })
      });

      const data = await response.json();

      if (data.status === "success") {
        setAnalysisResult({
          total: data.total,
          lines: data.lines
        });
      } else {
        setAnalysisResult({ total: "Code Error", lines: [] });
      }
    } catch (error) {
      console.error("Analysis Error:", error);
      setAnalysisResult({ total: "Error", lines: [] });
    }
  };

  const saveConfiguration = () => {
    if (!blocklyJson) {
      alert("No blocks to save!");
      return;
    }

    let fileName = prompt("Enter a name for your algorithm:", "my-algorithm");
    if (!fileName) return;
    if (!fileName.endsWith(".json")) fileName += ".json";

    const jsonString = JSON.stringify(blocklyJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (window.confirm("⚠️ Are you sure you want to delete all blocks? This cannot be undone.")) {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
      }
    }
  };

  const runCode = async () => {
    setConsoleOutput("> Running on server...");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedPython }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setConsoleOutput(data.output + "\n> Program finished.");
      } else {
        setConsoleOutput("> Error: " + data.output);
      }
    } catch (error) {
      console.error("Backend Error:", error);
      setConsoleOutput("> Error: Could not connect to Python server.");
    }
  };

  const handleTemplateSelect = async (e) => {
    const templatePath = e.target.value;
    if (!templatePath) return;

    const confirmLoad = window.confirm("Loading a template will overwrite your current workspace. Do you want to continue?");
    if (!confirmLoad) {
      e.target.value = "";
      return;
    }

    try {
      const response = await fetch(`/templates/${templatePath}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();
      if (workspaceRef.current) {
        const newCode = workspaceRef.current.loadTemplate(json);
        handleBlocklyChange(json, newCode);
      }
    } catch (error) {
      console.error("Failed to load template", error);
      alert(`Could not find the file: /templates/${templatePath}.json`);
    }
    e.target.value = "";
  };

  const handleThemeChange = (e) => {
    if (workspaceRef.current) {
      workspaceRef.current.setTheme(e.target.value);
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left-group">
          <h1>AlgoBlocks</h1>
        </div>
        <div className="header-right-group">
          <select
            className="save-button"
            style={{ backgroundColor: "#34495e", cursor: "pointer", marginRight: "10px" }}
            onChange={handleThemeChange}
            defaultValue="modern"
          >
            <option value="modern">☀️ Modern Theme</option>
            <option value="dark">🌙 Dark Theme</option>
          </select>

          <select
            className="save-button"
            style={{ backgroundColor: "#8e44ad", cursor: "pointer", marginRight: "10px" }}
            onChange={handleTemplateSelect}
            defaultValue=""
          >
            <option value="" disabled>📁 PRE-MADE TEMPLATES</option>
            <optgroup label="Search Algorithms">
              <option value="search/linear_search">Linear Search - O(n)</option>
              <option value="search/binary_search">Binary Search - O(log n)</option>
            </optgroup>
            <optgroup label="Sorting Algorithms">
              <option value="sort/bubble_sort">Bubble Sort - O(n²)</option>
              <option value="sort/insertion_sort">Insertion Sort - O(n²)</option>
              <option value="sort/selection_sort">Selection Sort - O(n²)</option>
              <option value="sort/merge_sort">Merge Sort - O(n log n)</option>
            </optgroup>
            <optgroup label="Recursive Algorithms">
              <option value="recursive/recursive_fibonacci">Fibonacci (recursive) - O(2ⁿ)</option>
            </optgroup>
          </select>

          <button className="save-button" onClick={saveConfiguration}>
            💾 SAVE BLOCKS
          </button>
          <button
            className="save-button"
            onClick={clearAll}
            style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
          >
            🗑️ CLEAR
          </button>
        </div>
        <div className="complexity-badge">
          Total Complexity: <strong>{analysisResult.total}</strong>
        </div>
      </header>

      <Split className="main-content" sizes={[70, 30]} minSize={300} gutterSize={10} snapOffset={30}>
        <Split className="left-column" direction="vertical" sizes={[70, 30]} minSize={100}>
          <div className="workspace-area">
            <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
          </div>
          <div className="code-area">
            <div className="panel-header">Generated Python</div>
            <pre>{generatedPython}</pre>
          </div>
        </Split>

        <Split className="right-column" direction="vertical" sizes={[50, 50]} minSize={100}>
          <div className="complexity-area">
            <div className="panel-header">Time Complexity</div>
            <table>
              <thead>
                <tr>
                  <th>Logic</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {analysisResult.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>{line.logic}</td>
                    <td>{line.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="console-area">
            <div className="panel-header">
              Console Output
              <button className="run-button" onClick={runCode}>▶ Run</button>
            </div>
            <pre>{consoleOutput}</pre>
          </div>
        </Split>
      </Split>
    </>
  );
}