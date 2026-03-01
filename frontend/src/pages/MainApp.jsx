import { useRef, useState } from "react";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import "../styles/MainApp.css";

export default function MainApp() {

  const location = useLocation(); // <-- initialize location

  const [analysisResult, setAnalysisResult] = useState({ 
    lines: [], 
    recurrence_lines: [],
    total: "O(1)",
    total_recurrence: "O(1)",
    space_lines: [],
    space_total: "O(1)",
    is_recursive: false
  });
  const [activeTab, setActiveTab] = useState("time_asymptotic");
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  
  const [viewMode, setViewMode] = useState("workspace"); 
  const [bottomPanel, setBottomPanel] = useState(null);

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
          total_recurrence: data.total_recurrence || data.total,
          lines: data.lines,
          recurrence_lines: data.recurrence_lines || [],
          space_total: data.space_total || "O(1)",
          space_lines: data.space_lines || [],
          is_recursive: data.is_recursive || false
        });
        
        // Prevent getting stuck on the Recurrence tab if a new algorithm isn't recursive 
        setActiveTab(prev => (prev === 'time_recurrence' && !data.is_recursive) ? 'time_asymptotic' : prev);
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

const loadAlgorithmTemplate = async (path, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmOverwrite = window.confirm(
        "Loading this algorithm will overwrite your current workspace. Any unsaved progress will be lost. Do you want to continue?"
      );
      if (!confirmOverwrite) return;
    }

    try {
      const response = await fetch(`/templates/${path}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();
      if (workspaceRef.current) {
        const newCode = workspaceRef.current.loadTemplate(json);
        handleBlocklyChange(json, newCode);
        setViewMode("workspace");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  // 2. ADD THIS EFFECT right below `loadAlgorithmTemplate`
  useEffect(() => {
    // If we arrived from the dashboard with a template selected
    if (location.state && location.state.templatePath) {
      // Add a slight delay to ensure Blockly is fully injected in the DOM before loading
      setTimeout(() => {
        loadAlgorithmTemplate(location.state.templatePath, true);
        
        // Clear the state so it doesn't trigger again if the component re-renders
        window.history.replaceState({}, document.title);
      }, 300);
    }
  }, [location.state]);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the workspace? All unsaved progress will be lost.")) {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
        setGeneratedPython("# Drag blocks to generate Python code");
        setBlocklyJson(null);
        setAnalysisResult({ 
          lines: [], 
          recurrence_lines: [],
          total: "O(1)",
          total_recurrence: "O(1)",
          space_lines: [],
          space_total: "O(1)",
          is_recursive: false
        });
        setActiveTab("time_asymptotic");
      }
    }
  };

  const handleSave = () => {
    const projectName = window.prompt("Enter a name for your project file:", "my_algorithm");
    
    if (projectName) {
      if (!blocklyJson) {
        alert("The workspace is empty. Nothing to save!");
        return;
      }

      const jsonString = JSON.stringify(blocklyJson, null, 2);
      
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console");
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedPython }),
      });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch {
      setConsoleOutput("> Connection Error");
    }
  };

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        
        {/* Left Side: Logo & Workspace Actions */}
        <div className="header-left">
          <h1 className="app-logo">ALGOBLOCKS</h1>
          <div className="header-actions">
            <button onClick={handleSave} className="save-button">💾 Save</button>
            <button onClick={handleClear} className="clear-button">🗑️ Clear</button>
          </div>
        </div>
        
        {/* Center: View Modes & Run */}
        <div className="header-center">
          <button 
            onClick={() => setViewMode("workspace")} 
            className={`view-mode-btn ${viewMode === 'workspace' ? 'active' : ''}`}
          >
            📂 Workspace
          </button>
          <button 
            onClick={() => setViewMode("python")} 
            className={`view-mode-btn ${viewMode === 'python' ? 'active' : ''}`}
          >
            🐍 Python Code
          </button>
          <button onClick={runCode} className="run-btn">▶ RUN</button>
        </div>
        
        {/* Right Side: Complexity */}
        <div className="complexity-badge">
          Total: {activeTab === 'space' ? analysisResult.space_total : 
                  activeTab === 'time_recurrence' ? analysisResult.total_recurrence : 
                  analysisResult.total}
        </div>
      </header>

      {/* MAIN BODY WITH ADJUSTABLE SIDEBAR */}
      <Split 
        cclassName="main-split" 
        sizes={[20, 80]} 
        minSize={[150, 400]} 
        gutterSize={8}
        style={{ flex: 1, display: 'flex' }}
      >
        {/* SIDEBAR */}
        <aside className="sidebar">
          <h3 className="sidebar-title">TEMPLATES</h3>
          
          <div className="sidebar-categories">
            {/* SEARCHING */}
            <div>
              <p className="category-title">SEARCHING</p>
              <div className="category-buttons">
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('search/linear_search')}>Linear Search</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('search/binary_search')}>Binary Search</button>
              </div>
            </div>

            {/* SORTING */}
            <div>
              <p className="category-title">SORTING</p>
              <div className="category-buttons">
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/bubble_sort')}>Bubble Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/merge_sort')}>Merge Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/insertion_sort')}>Insertion Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/selection_sort')}>Selection Sort</button>
              </div>
            </div>

            {/* RECURSIVE */}
            <div>
              <p className="category-title">RECURSIVE</p>
              <div className="category-buttons">
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_factorial')}>Factorial</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_fibonacci')}>Fibonacci</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_permutation')}>Permutation</button>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="main-content">
          <div className="workspace-wrapper" style={{ display: viewMode === 'workspace' ? 'block' : 'none' }}>
            <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
          </div>
          
          <div className="python-wrapper" style={{ display: viewMode === 'python' ? 'block' : 'none' }}>
            <pre className="python-code-pre">{generatedPython}</pre>
          </div>

          {/* HOVERING CONSOLE / COMPLEXITY PANEL */}
          {bottomPanel && (
            <div className="hover-panel">
              <div className="panel-header">
                <span className="panel-title">{bottomPanel === 'console' ? '💻 CONSOLE' : '📊 COMPLEXITY ANALYSIS'}</span>
                <button onClick={() => setBottomPanel(null)} className="panel-close-btn">✕</button>
              </div>
              <div className="panel-body">
                {bottomPanel === 'console' ? (
                  <pre className="console-output">{consoleOutput}</pre>
                ) : (
                  <div className="complexity-content">
                    <div className="complexity-tabs">
                      <button 
                        onClick={() => setActiveTab("time_asymptotic")} 
                        className={`tab-btn ${activeTab === 'time_asymptotic' ? 'active' : ''}`}
                      >
                        Asymptotic Analysis
                      </button>
                      
                      {/* ONLY rendered when is_recursive boolean is flagged true by python index.py */}
                      {analysisResult.is_recursive && (
                        <button 
                          onClick={() => setActiveTab("time_recurrence")} 
                          className={`tab-btn ${activeTab === 'time_recurrence' ? 'active' : ''}`}
                        >
                          Recurrence Relation
                        </button>
                      )}

                      <button 
                        onClick={() => setActiveTab("space")} 
                        className={`tab-btn ${activeTab === 'space' ? 'active' : ''}`}
                      >
                        Space
                      </button>
                    </div>
                    <table className="complexity-table">
                      <thead>
                        <tr>
                          <th>Line of Code</th>
                          <th className="right-align">Complexity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Tab Switcher Handler Map Array */}
                        {(activeTab === 'time_asymptotic' ? analysisResult.lines : 
                          activeTab === 'time_recurrence' ? analysisResult.recurrence_lines : 
                          analysisResult.space_lines).map((row, i) => (
                        <tr key={i}>
                          {/* Left Column: Code Snippet with pedagogical indentation */}
                          <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${(row.indent || 0) * 15}px` }}>
                            {row.lineOfCode}
                          </td>
                          
                          {/* Right Column: Complexity notation using the SAME color */}
                          <td className="complexity-cell" style={{ color: row.color || 'white' }}>
                            {row.complexity}
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLOATING BOTTOM CONTROLS */}
          <footer className="floating-footer">
            <button 
              onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')} 
              className={`footer-btn ${bottomPanel === 'console' ? 'active' : 'inactive'}`}
            >
              ⌨️ Console
            </button>
            <div className="footer-divider"></div>
            <button 
              onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')} 
              className={`footer-btn ${bottomPanel === 'complexity' ? 'active' : 'inactive'}`}
            >
              📊 Complexity
            </button>
          </footer>
        </main>
      </Split>
    </div>
  );
}