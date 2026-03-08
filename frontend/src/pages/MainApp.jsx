import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx"; // IMPORT MODAL
import WorkspaceHeader from "../components/WorkspaceHeader.jsx";
import "../styles/MainApp.css";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SIDEBAR_TEMPLATES = [
  { name: "Linear Search", path: "search/linear_search", desc: "Sequentially checks each element until the target is found or the list is exhausted." },
  { name: "Binary Search", path: "search/binary_search", desc: "Finds the position of a target value within a sorted array by repeatedly dividing the search interval in half." }, 
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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // --- CONFIRM MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    isDanger: false,
    onConfirmAction: null
  });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  
  // --- DRAG TO RESIZE LOGIC ---
  const [panelHeight, setPanelHeight] = useState(450);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY - 48;
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
    e.preventDefault(); 
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

  const executeLoadTemplate = async (path) => {
    try {
      const response = await fetch(`/templates/${path}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();
      
      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
        setViewMode("workspace");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  const loadAlgorithmTemplate = (path, skipConfirm = false) => {
    if (!skipConfirm) {
      setModalConfig({
        isOpen: true,
        title: "Load Pre-made Template?",
        message: "Loading this algorithm will overwrite your current workspace. Do you want to continue?",
        confirmText: "Load Template",
        isDanger: false,
        onConfirmAction: () => {
          closeModal();
          executeLoadTemplate(path);
        }
      });
    } else {
      executeLoadTemplate(path);
    }
  };

  useEffect(() => {
    if (location.state) {
      setTimeout(() => {
        // 1. Handle loading pre-made algorithm templates
        if (location.state.templatePath) {
          loadAlgorithmTemplate(location.state.templatePath, true);
        }
        
        // 2. Handle loading saved projects from MongoDB
        if (location.state.projectToLoad && workspaceRef.current) {
          // Load the saved JSON data into the workspace
          workspaceRef.current.loadTemplate(location.state.projectToLoad.data);
          setViewMode("workspace");
        }

        // Clear the state so refreshing doesn't trigger the load again
        window.history.replaceState({}, document.title);
      }, 300); // Small delay ensures Blockly is fully mounted
    }
  }, [location.state]);

  const handleClear = () => {
    setModalConfig({
      isOpen: true,
      title: "Clear Workspace?",
      message: "Are you sure you want to clear the workspace? All unsaved progress will be lost.",
      confirmText: "Clear Workspace",
      isDanger: true,
      onConfirmAction: () => {
        closeModal();
        if (workspaceRef.current) {
          workspaceRef.current.clear();
          setGeneratedPython("# Drag blocks to generate Python code");
          setBlocklyJson(null);
          setAnalysisResult({ lines: [], recurrence_lines: [], total: "O(1)", total_recurrence: "O(1)", space_lines: [], space_total: "O(1)", is_recursive: false });
          setActiveTab("time_asymptotic");
          setBottomPanel(null);
        }
      }
    });
  };

  const handleExport = () => {
    const projectName = window.prompt("Enter a name for your export file:", "my_algorithm");
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
      alert("The workspace is empty. Nothing to export!");
    }
  };

  const handleSaveToDB = async () => {
    if (!blocklyJson) {
      alert("The workspace is empty. Nothing to save!");
      return;
    }
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      alert("You must be signed in to save projects to the cloud.");
      return;
    }
    
    const user = JSON.parse(storedUser);
    const projectName = window.prompt("Enter a name for your project:", "my_algorithm");
    
    if (projectName) {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: projectName,
            data: blocklyJson,
            owner_id: user.email
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          alert("Project saved successfully!");
        } else {
          alert("Failed to save project: " + (result.detail || "Unknown error"));
        }
      } catch (error) {
        console.error("Failed to save project:", error);
        alert("An error occurred while saving the project. Check console.");
      }
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
      
      <WorkspaceHeader 
        viewMode={viewMode}
        setViewMode={setViewMode}
        runCode={runCode}
        handleExport={handleExport}
        handleSaveToDB={handleSaveToDB}
      />

      <Split 
        className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} 
        sizes={[20, 80]} 
        minSize={[250, 400]} 
        gutterSize={8}
      >
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

        <main className="workspace-main">
          
          <button 
            className={`sidebar-toggle-btn ${!isSidebarVisible ? 'closed' : ''}`}
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? "Hide Templates" : "Show Templates"}
          >
            <span className="toggle-icon">❮</span>
          </button>

          <div className="editor-container">
            <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
            </div>
            
            <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#1C1236', overflow: 'auto' }}>
              <SyntaxHighlighter 
                language="python" 
                style={shadesOfPurple}
                showLineNumbers={true}
                customStyle={{
                  margin: 0,
                  padding: '20px',
                  fontSize: '0.95rem',
                  fontFamily: "'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
                  background: '#1C1236',
                  color: '#EBE4FF', 
                  minHeight: '100%'
                }}
              >
                {generatedPython}
              </SyntaxHighlighter>
            </div>
          </div>

          {bottomPanel && (
            <div className="bottom-hover-panel" style={{ height: `${panelHeight}px` }}>
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
                      <button
                        onClick={() => setActiveTab("time")}
                        className={`tab-btn ${activeTab === 'time' ? 'active' : ''}`}>
                        Time Complexity
                      </button>
                      <button
                        onClick={() => setActiveTab("space")}
                        className={`tab-btn ${activeTab === 'space' ? 'active' : ''}`}>
                        Space Complexity
                      </button>
                      <span className="total-badge">
                        <span className="total-label">Total:</span>{" "}
                        {activeTab === "space"
                          ? analysisResult.space_total
                          : analysisResult.total}
                      </span>
                    </div>
                    
                    <div className="complexity-table-wrapper">
                      <table className="complexity-table">
                        <thead>
                          <tr>
                            <th>Line of Code</th>
                            <th className="right-align">Complexity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeTab === 'time' ? analysisResult.lines
                            : activeTab === 'time_recurrence' ? analysisResult.recurrence_lines
                            : analysisResult.space_lines
                          ).map((row, i) => (
                            <tr key={i}>
                              <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>
                                {row.lineOfCode}
                              </td>
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
                <img src="/assets/recursive-icon.png" alt="Refresh" />
              </button>
            </div>
          </footer>

        </main>
      </Split>

      {/* RENDER THE CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDanger={modalConfig.isDanger}
        onCancel={closeModal}
        onConfirm={modalConfig.onConfirmAction}
      />
    </div>
  );
}