import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import "../styles/MainApp.css";

const SIDEBAR_TEMPLATES = [
  { name: "Linear Search", path: "search/linear_search", desc: "Sequentially checks each element until the target is found or the list is exhausted." },
  { name: "Bubble Sort", path: "sort/bubble_sort", desc: "Repeatedly swaps adjacent elements if they are in the wrong order." },
  { name: "Selection Sort", path: "sort/selection_sort", desc: "Finds the minimum element from the unsorted part and places it at the beginning." },
  { name: "Insertion Sort", path: "sort/insertion_sort", desc: "Builds the final sorted array one element at a time by inserting elements into their correct position." },
  { name: "Merge Sort", path: "sort/merge_sort", desc: "Divides the array into halves, sorts them, and merges them back." },
  { name: "Factorial (Recursive)", path: "recursive/recursive_factorial", desc: "Calculates the factorial of a number using recursion." },
  { name: "Fibonacci (Recursive)", path: "recursive/recursive_fibonacci", desc: "Generates the Fibonacci sequence using recursive calls." },
  { name: "Permutation (Recursive)", path: "recursive/recursive_permutation", desc: "Generates all permutations of a string using backtracking." }
];

export default function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();

  const [analysisResult, setAnalysisResult] = useState({ 
    lines: [], recurrence_lines: [], total: "O(1)", total_recurrence: "O(1)", space_lines: [], space_total: "O(1)", is_recursive: false
  });
  
  const [activeTab, setActiveTab] = useState("time_asymptotic");
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  
  const [viewMode, setViewMode] = useState("workspace"); 
  const [bottomPanel, setBottomPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- DRAG TO RESIZE LOGIC ---
  const [panelHeight, setPanelHeight] = useState(300);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      // Calculate new height: total window height - mouse Y position - footer height (48px)
      const newHeight = window.innerHeight - e.clientY - 48;
      
      // Clamp the height between 150px and the top of the window
      if (newHeight >= 150 && newHeight <= window.innerHeight - 150) {
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragStart = (e) => {
    e.preventDefault(); // Prevents accidental text selection while dragging
    isDragging.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };
  // ----------------------------

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
        setActiveTab(prev => (prev === 'time_recurrence' && !data.is_recursive) ? 'time_asymptotic' : prev);
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  const loadAlgorithmTemplate = async (path, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmOverwrite = window.confirm("Loading this algorithm will overwrite your current workspace. Do you want to continue?");
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

  useEffect(() => {
    if (location.state && location.state.templatePath) {
      setTimeout(() => {
        loadAlgorithmTemplate(location.state.templatePath, true);
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
        setAnalysisResult({ lines: [], recurrence_lines: [], total: "O(1)", total_recurrence: "O(1)", space_lines: [], space_total: "O(1)", is_recursive: false });
        setActiveTab("time_asymptotic");
        setBottomPanel(null);
      }
    }
  };

  const handleSave = () => {
    const projectName = window.prompt("Enter a name for your project file:", "my_algorithm");
    if (projectName && blocklyJson) {
      const blob = new Blob([JSON.stringify(blocklyJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (!blocklyJson) {
      alert("The workspace is empty. Nothing to save!");
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

  const filteredTemplates = SIDEBAR_TEMPLATES.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="workspace-app-container">
      {/* HEADER */}
      <header className="workspace-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <img src="/assets/back-icon.png" alt="Back" className="btn-icon" /> 
            Back to Dashboard
          </button>
          <span className="project-name">Untitled Project</span>
        </div>
        
        <div className="header-center">
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'workspace' ? 'active' : ''}`} onClick={() => setViewMode("workspace")}>Workspace</button>
            <button className={`toggle-btn ${viewMode === 'python' ? 'active' : ''}`} onClick={() => setViewMode("python")}>Python Code</button>
          </div>
        </div>
        
        <div className="header-right">
          <button onClick={runCode} className="action-btn btn-run">
            <img src="/assets/play-icon.png" alt="Run" className="btn-icon" /> Run
          </button>
          <button onClick={() => setBottomPanel("complexity")} className="action-btn btn-analyze">
            <img src="/assets/analyze-icon.png" alt="Analyze" className="btn-icon" /> Analyze
          </button>
          <button onClick={handleSave} className="action-btn btn-save">
            Sign in to save
          </button>
        </div>
      </header>

      {/* MAIN SPLIT VIEW */}
      <Split 
        className="workspace-split" 
        sizes={[20, 80]} 
        minSize={[250, 400]} 
        gutterSize={8}
      >
        {/* SIDEBAR */}
        <aside className="templates-sidebar">
          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input 
              type="text" 
              placeholder="Search Templates" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="sidebar-list">
            {filteredTemplates.map((template) => (
              <div key={template.name} className="sidebar-card" onClick={() => loadAlgorithmTemplate(template.path)}>
                <h4>{template.name}</h4>
                <p>{template.desc}</p>
              </div>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="no-results">No templates found.</p>
            )}
          </div>
        </aside>

        {/* MAIN WORKSPACE AREA */}
        <main className="workspace-main">
          
          {/* Blocks or Python Editor */}
          <div className="editor-container">
            <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
            </div>
            <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#0d0d0d', padding: '20px', overflow: 'auto' }}>
              <pre className="python-code-pre">{generatedPython}</pre>
            </div>
          </div>

          {/* DOCKED RESIZABLE HOVER PANEL */}
          {bottomPanel && (
            <div className="bottom-hover-panel" style={{ height: `${panelHeight}px` }}>
              {/* DRAG HANDLE FOR RESIZING */}
              <div className="panel-resizer" onMouseDown={handleDragStart}>
                <div className="resizer-dash"></div>
              </div>
              
              <div className="panel-header">
                <span className="panel-title">{bottomPanel === 'console' ? 'Console Output' : 'Complexity Analysis'}</span>
                <button onClick={() => setBottomPanel(null)} className="panel-close-btn">✕</button>
              </div>
              <div className="panel-body">
                {bottomPanel === 'console' ? (
                  <pre className="console-output">{consoleOutput}</pre>
                ) : (
                  <div className="complexity-content">
                    <div className="complexity-tabs">
                      <button onClick={() => setActiveTab("time_asymptotic")} className={`tab-btn ${activeTab === 'time_asymptotic' ? 'active' : ''}`}>Asymptotic Analysis</button>
                      {analysisResult.is_recursive && (
                        <button onClick={() => setActiveTab("time_recurrence")} className={`tab-btn ${activeTab === 'time_recurrence' ? 'active' : ''}`}>Recurrence Relation</button>
                      )}
                      <button onClick={() => setActiveTab("space")} className={`tab-btn ${activeTab === 'space' ? 'active' : ''}`}>Space</button>
                      <span className="total-badge">Total: {activeTab === 'space' ? analysisResult.space_total : activeTab === 'time_recurrence' ? analysisResult.total_recurrence : analysisResult.total}</span>
                    </div>
                    
                    {/* CENTERED & COMPACT TABLE WRAPPER */}
                    <div className="complexity-table-wrapper">
                      <table className="complexity-table">
                        <thead>
                          <tr>
                            <th>Line of Code</th>
                            <th className="right-align">Complexity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeTab === 'time_asymptotic' ? analysisResult.lines : activeTab === 'time_recurrence' ? analysisResult.recurrence_lines : analysisResult.space_lines).map((row, i) => (
                            <tr key={i}>
                              <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>{row.lineOfCode}</td>
                              <td className="complexity-cell" style={{ color: row.color || 'white' }}>{row.complexity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCKED FOOTER */}
          <footer className="workspace-footer">
            <div className="footer-left">
              <button 
                className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`}
                onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}
              >
                <img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console
              </button>
              <button 
                className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`}
                onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}
              >
                <img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity
              </button>
            </div>
            
            <div className="footer-right">
              <button className="footer-action-icon" onClick={handleClear} title="Clear Workspace">
                <img src="/assets/refresh-icon.png" alt="Refresh" />
              </button>
            </div>
          </footer>

        </main>
      </Split>
    </div>
  );
}