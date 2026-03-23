import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Split from "react-split";
import BigOModal from "../components/BigOModal.jsx";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import ComplexityGraph from '../components/ComplexityGraph.jsx';
import ConfirmModal from "../components/ConfirmModal.jsx";
import WorkspaceHeader from "../components/WorkspaceHeader.jsx";
import "../styles/MainApp.css";
import { formatComplexity } from "../utils/formatters";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/prism';

import Editor from "@monaco-editor/react";

const SIDEBAR_TEMPLATES = [
  { name: "Linear Search", path: "search/linear_search", desc: "Sequentially checks each element until the target is found or the list is exhausted." },
  { name: "Binary Search", path: "search/binary_search", desc: "Finds the position of a target value within a sorted array by repeatedly dividing the search interval in half." },
  { name: "Exponential Search", path: "search/exponential_search", desc: "Finds the range where the target may exist by repeated doubling, then performs binary search within that range." },
  { name: "Bubble Sort", path: "sort/bubble_sort", desc: "Repeatedly swaps adjacent elements if they are in the wrong order." },
  { name: "Selection Sort", path: "sort/selection_sort", desc: "Finds the minimum element from the unsorted part and places it at the beginning." },
  { name: "Insertion Sort", path: "sort/insertion_sort", desc: "Builds the final sorted array one element at a time by inserting elements into their correct position." },
  { name: "Merge Sort", path: "sort/merge_sort", desc: "Divides the array into halves, sorts them, and merges them back." },
  { name: "Quick Sort", path: "sort/quick_sort", desc: "Partitions elements around a pivot, then recursively sorts the subarrays." },
  { name: "Factorial (Recursive)", path: "recursive/recursive_factorial", desc: "Calculates the factorial of a number using recursion." },
  { name: "Fibonacci (Recursive)", path: "recursive/recursive_fibonacci", desc: "Generates the Fibonacci sequence using recursive calls." },
  { name: "Permutation (Recursive)", path: "recursive/recursive_permutation", desc: "Generates all permutations of a string using backtracking." },
  { name: "Tower of Hanoi (Recursive)", path: "recursive/recursive_tower_of_hanoi", desc: "Moves disks between rods following the Tower of Hanoi rules using recursion." },
];

export default function MainApp() {
  const location = useLocation();

  // Mode Selection State - Default to null to trigger the prompt, unless navigated with a specific mode
  const [codingMode, setCodingMode] = useState(location.state?.initialCodingMode || null);

  // Keep track of templates or projects that need to be loaded AFTER a mode is selected
  const [pendingLoad, setPendingLoad] = useState({
    templatePath: location.state?.templatePath || null,
    projectToLoad: location.state?.projectToLoad || null,
  });

  const [manualPythonCode, setManualPythonCode] = useState("# Write your Python code here\n");

  const [analysisResult, setAnalysisResult] = useState({
    lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false
  });

  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);

  const [viewMode, setViewMode] = useState("workspace");
  const [bottomPanel, setBottomPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("Untitled Project");

  const [activeTab, setActiveTab] = useState("local");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: "", message: "", confirmText: "Confirm", isDanger: false, onConfirmAction: null
  });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  const [isBigOModalOpen, setIsBigOModalOpen] = useState(false);
  const [expandedLines, setExpandedLines] = useState({});

  const toggleLine = (index) => setExpandedLines(prev => ({ ...prev, [index]: !prev[index] }));

  const [panelHeight, setPanelHeight] = useState(450);
  const isDragging = useRef(false);
  const analysisTimeoutRef = useRef(null);
  const workspaceRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY - 48;
      if (newHeight >= 150 && newHeight <= window.innerHeight - 150) setPanelHeight(newHeight);
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

  const performAnalysis = async (codeStr) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeStr })
      });
      const data = await response.json();
      if (data.status === "success") {
        setAnalysisResult({
          total: data.total, space_total: data.space_total || "O(1)",
          lines: data.lines || [], is_recursive: data.is_recursive || false
        });
      } else {
        setAnalysisResult({
          total: "Error", space_total: "Error",
          lines: [{ lineOfCode: "Analysis Failed", operation: "-", local_time: "Error", global_time: "Error", local_space: "Error", global_space: "Error", local_explanation: data.message || "Error", global_explanation: "Error" }],
          is_recursive: false
        });
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  const handleBlocklyChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    setBlocklyJson(json);
    performAnalysis(pythonCode);
  };

  const handleManualCodeChange = (value) => {
    setManualPythonCode(value);
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = setTimeout(() => performAnalysis(value), 1000);
  };

  const executeLoadTemplate = async (path) => {
    if (codingMode === 'manual') {
      alert("Templates are currently designed for Block-based mode. Switching to manual will clear the visual template.");
      return;
    }

    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      const response = await fetch(`/templates/${path}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();

      if (codingMode === 'blocks' && workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
        setViewMode("workspace");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  const loadAlgorithmTemplate = (path, skipConfirm = false) => {
    if (codingMode === 'manual') {
      alert("Templates are currently designed for Block-based mode.");
      return;
    }
    if (!skipConfirm) {
      setModalConfig({
        isOpen: true, title: "Load Pre-made Template?", message: "Loading this algorithm will overwrite your current workspace. Do you want to continue?", confirmText: "Load Template", isDanger: false,
        onConfirmAction: () => { closeModal(); executeLoadTemplate(path); }
      });
    } else {
      executeLoadTemplate(path);
    }
  };

  // Centralized Hook: Wait until `codingMode` is chosen, then load pending projects/templates
  useEffect(() => {
    if (codingMode !== null && (pendingLoad.templatePath || pendingLoad.projectToLoad)) {
      // Delay execution slightly so Monaco or Blockly has time to mount in the DOM
      setTimeout(() => {
        if (pendingLoad.templatePath) {
          loadAlgorithmTemplate(pendingLoad.templatePath, true);
        }
        if (pendingLoad.projectToLoad) {
          if (codingMode === 'blocks' && workspaceRef.current) {
            workspaceRef.current.loadTemplate(pendingLoad.projectToLoad.data);
            setCurrentProjectId(pendingLoad.projectToLoad._id);
            setCurrentProjectTitle(pendingLoad.projectToLoad.title);
            setViewMode("workspace");
          } else if (codingMode === 'manual') {
            alert("This project was saved in Block mode and cannot be loaded directly into the Manual Python IDE yet.");
          }
        }

        // Clear pending actions and browser history state so it doesn't loop
        setPendingLoad({ templatePath: null, projectToLoad: null });
        window.history.replaceState({}, document.title);
      }, 500);
    }
  }, [codingMode, pendingLoad]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (codingMode === 'blocks' && !blocklyJson) {
          alert("The workspace is empty. Nothing to save!");
          return;
        }
        if (currentProjectId) handleUpdateDB();
        else handleSaveToDB();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectId, blocklyJson, codingMode]);

  const handleClear = () => {
    setModalConfig({
      isOpen: true, title: "Clear Workspace?", message: "Are you sure you want to clear the workspace? All unsaved progress will be lost.", confirmText: "Clear Workspace", isDanger: true,
      onConfirmAction: () => {
        closeModal();
        if (codingMode === 'blocks' && workspaceRef.current) {
          workspaceRef.current.clear();
          setGeneratedPython("# Drag blocks to generate Python code");
          setBlocklyJson(null);
        } else if (codingMode === 'manual') {
          setManualPythonCode("# Write your Python code here\n");
        }
        setAnalysisResult({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
        setBottomPanel(null);
        setExpandedLines({});
        setCurrentProjectId(null);
        setCurrentProjectTitle("Untitled Project");
      }
    });
  };

  const handleExport = () => {
    if (codingMode === 'manual') {
      const projectName = window.prompt("Enter a name for your export file:", "my_algorithm");
      if (projectName && manualPythonCode) {
        const blob = new Blob([manualPythonCode], { type: "text/x-python" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `${projectName.replace(/\s+/g, '_')}.py`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      return;
    }

    const projectName = window.prompt("Enter a name for your export file:", "my_algorithm");
    if (projectName && blocklyJson) {
      const blob = new Blob([JSON.stringify(blocklyJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${projectName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (!blocklyJson) {
      alert("The workspace is empty. Nothing to export!");
    }
  };

  const handleSaveToDB = async () => { /* Add logic for saving IDE code later if needed */ };
  const handleUpdateDB = async () => { /* Add logic for saving IDE code later if needed */ };

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console");
    setExpandedLines({});
    const codeToRun = codingMode === "manual" ? manualPythonCode : generatedPython;
    try {
      const response = await fetch("/api/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToRun }),
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
      {/* INITIAL DIALOG: Automatically overlays when user navigates directly to /app */}
      {codingMode === null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#1C1236', padding: '40px', borderRadius: '12px',
            textAlign: 'center', border: '1px solid #6C5CE7', maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: '#EBE4FF', marginBottom: '15px' }}>Choose Workspace Mode</h2>
            <p style={{ color: '#A096B9', marginBottom: '30px', lineHeight: '1.5' }}>
              Select how you want to build your algorithm. You can use our visual block builder or jump straight into writing Python code.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={() => setCodingMode('blocks')} style={{
                padding: '12px 24px', background: '#6C5CE7', color: 'white', fontWeight: 'bold',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <img src="/assets/blocks-icon.png" alt="Blocks" style={{ width: '20px', filter: 'brightness(0) invert(1)' }} />
                Block Workspace
              </button>
              <button onClick={() => setCodingMode('manual')} style={{
                padding: '12px 24px', background: 'transparent', color: '#6C5CE7', fontWeight: 'bold',
                border: '2px solid #6C5CE7', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <img src="/assets/python-icon.png" alt="Python" style={{ width: '20px' }} />
                Manual Coding
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        runCode={runCode}
        handleExport={handleExport}
        handleSaveToDB={handleSaveToDB}
        currentProjectId={currentProjectId}
        currentProjectTitle={currentProjectTitle}
        handleUpdateDB={handleUpdateDB}
        codingMode={codingMode}
      />

      <Split
        className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}
        sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}
      >
        <aside className="templates-sidebar">
          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search Templates" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="sidebar-list">
            {filteredTemplates.map((template) => (
              <div key={template.name} className="sidebar-card" onClick={() => loadAlgorithmTemplate(template.path)}>
                <h4>{template.name}</h4>
                <p>{template.desc}</p>
              </div>
            ))}
            {filteredTemplates.length === 0 && <p className="no-results">No templates found.</p>}
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
            {codingMode === 'blocks' ? (
              <>
                <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
                  <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
                </div>
                <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#1C1236', overflow: 'auto' }}>
                  <SyntaxHighlighter language="python" style={shadesOfPurple} showLineNumbers={true}
                    customStyle={{ margin: 0, padding: '20px', fontSize: '0.95rem', fontFamily: "'Fira Code', Consolas, Monaco, monospace", background: '#1C1236', color: '#EBE4FF', minHeight: '100%' }}>
                    {generatedPython}
                  </SyntaxHighlighter>
                </div>
              </>
            ) : codingMode === 'manual' ? (
              <div style={{ height: '100%', width: '100%' }}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="shadesOfPurpleCustom"
                  value={manualPythonCode}
                  onChange={handleManualCodeChange}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme('shadesOfPurpleCustom', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: 'B362FF', fontStyle: 'italic' },
                        { token: 'keyword', foreground: 'FF9D00' },
                        { token: 'string', foreground: 'A5FF90' },
                        { token: 'number', foreground: 'FF628C' },
                        { token: 'operator', foreground: 'FF9D00' },
                        { token: 'function', foreground: '9EFFFF' },
                        { token: 'type', foreground: '9EFFFF' },
                        { token: 'variable', foreground: 'FFFFFF' },
                      ],
                      colors: {
                        'editor.background': '#1C1236', // Matches your MainApp/ActivityApp container
                        'editor.foreground': '#FFFFFF',
                        'editorLineNumber.foreground': '#A599E9',
                        'editorCursor.foreground': '#FAD000',
                        'editor.selectionBackground': '#B362FF44',
                        'editor.lineHighlightBackground': '#2D2B55',
                        'editorIndentGuide.background': '#A599E944',
                        'editorWhitespace.foreground': '#A599E922',
                      }
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                    padding: { top: 20 },
                    wordWrap: "on",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true
                  }}
                />
              </div>
            ) : (
              /* Empty state while the prompt is active */
              <div style={{ height: '100%', background: '#1C1236' }}></div>
            )}
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
                    <div className="complexity-tabs" style={{ justifyContent: 'space-between', padding: '0 15px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setActiveTab("local"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}>Local Complexity</button>
                        <button onClick={() => { setActiveTab("global"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}>Global Complexity</button>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span className="total-badge"><span className="total-label">Total Time:</span> {analysisResult.total}</span>
                        <span className="total-badge" style={{ backgroundColor: 'rgba(0, 184, 163, 0.15)', color: '#00b8a3', border: '1px solid rgba(0, 184, 163, 0.3)' }}><span className="total-label" style={{ color: '#00b8a3' }}>Total Space:</span> {analysisResult.space_total}</span>
                      </div>
                    </div>

                    <div className="complexity-table-wrapper" style={{ overflowX: 'auto' }}>
                      <table className="complexity-table" style={{ width: '100%', minWidth: '800px', textAlign: 'left' }}>
                        <thead>
                          <tr><th>Line of Code</th><th>Operation</th><th>{activeTab === 'local' ? 'Local Time' : 'Global Time'}</th><th>{activeTab === 'local' ? 'Local Space' : 'Global Space'}</th></tr>
                        </thead>
                        <tbody>
                          {analysisResult.lines.map((row, i) => {
                            const explanationText = activeTab === 'local' ? row.local_explanation : row.global_explanation;
                            return (
                              <React.Fragment key={i}>
                                <tr className={`complexity-row ${expandedLines[i] ? 'expanded' : ''}`} onClick={() => toggleLine(i)} style={{ cursor: explanationText ? 'pointer' : 'default' }}>
                                  <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>{row.lineOfCode}</td>
                                  <td style={{ color: '#000000' }}>{row.operation || '-'}</td>
                                  <td className="complexity-cell">{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell">
                                    {formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}
                                    {explanationText && <span className="dropdown-chevron" style={{ marginLeft: '10px' }}>{expandedLines[i] ? '▼' : '▶'}</span>}
                                  </td>
                                </tr>
                                {expandedLines[i] && explanationText && (
                                  <tr className="explanation-row">
                                    <td colSpan="4">
                                      <div className="explanation-content" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}><img src="/assets/lightbulb-icon.png" alt="Lightbulb" className="tab-icon" /><p>{explanationText}</p></div>
                                        <div style={{ minWidth: '200px' }}><ComplexityGraph complexity={activeTab === 'local' ? row.local_time : row.global_time} color={row.color} label={activeTab === 'local' ? 'Local' : 'Global'} /></div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
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
              <button className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}>
                <img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console
              </button>
              <button className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}>
                <img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity
              </button>
              <button className="footer-tab" onClick={() => setIsBigOModalOpen(true)} style={{ color: '#ffffff', fontWeight: 'bold' }}>
                <img src="/assets/table-icon.png" alt="Reference" className="tab-icon" /> Big O Reference
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

      <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} isDanger={modalConfig.isDanger} onCancel={closeModal} onConfirm={modalConfig.onConfirmAction} />
      <BigOModal isOpen={isBigOModalOpen} onClose={() => setIsBigOModalOpen(false)} />
    </div>
  );
}