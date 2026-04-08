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

  // --- NEW: User Custom Templates ---
  const [userTemplates, setUserTemplates] = useState([]);
  
  // --- NEW: UI States (Replacing Alerts) ---
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [saveModal, setSaveModal] = useState({ isOpen: false, title: "", description: "" });

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
  const workspaceRef = useRef(null);
  const [isEditingCode, setIsEditingCode] = useState(false);

  // --- NEW: Toast Notification Helper ---
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // --- NEW: Fetch User's Saved Templates ---
  const fetchUserTemplates = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    const user = JSON.parse(storedUser);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.status === 'success') {
        const templates = data.projects
          .filter(p => p.owner_id === user.email)
          .map(p => ({
            _id: p._id,
            name: p.title,
            desc: p.description || "Custom saved template",
            isCustom: true,
            data: p.data
          }));
        setUserTemplates(templates);
      }
    } catch (e) {
      console.error("Failed to load custom templates", e);
    }
  };

  useEffect(() => {
    fetchUserTemplates();
    // eslint-disable-next-line
  }, []);

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

  const handleSyncToBlocks = () => {
    if (workspaceRef.current && generatedPython) {
      workspaceRef.current.loadFromPython(generatedPython);
      setIsEditingCode(false);
      setViewMode("workspace");
      showToast("Code successfully synced to Blocks");
    }
  };

  const handleBlocklyChange = async (json, pythonCode) => {
    if (!isEditingCode) setGeneratedPython(pythonCode);
    setBlocklyJson(json);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pythonCode })
      });
      const data = await response.json();
      if (data.status === "success") {
        setAnalysisResult({ total: data.total, space_total: data.space_total || "O(1)", lines: data.lines || [], is_recursive: data.is_recursive || false });
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  // --- UPDATED: Load Templates (Handles both pre-made and custom) ---
  const executeLoadTemplate = async (template) => {
    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      let json;

      if (template.isCustom) {
        // Load user's saved project
        json = template.data;
        setCurrentProjectId(template._id); 
      } else {
        // Load default pre-made template
        const response = await fetch(`/templates/${template.path}.json`);
        if (!response.ok) throw new Error("Template not found");
        json = await response.json();
        setCurrentProjectId(null); // CRITICAL: Treat this as a fresh file so saving it clones it to the user's account
      }

      setCurrentProjectTitle(template.name);
      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
        setViewMode("workspace");
      }
    } catch (error) {
      showToast("Failed to load template", "error");
    }
  };

  const loadAlgorithmTemplate = (template, skipConfirm = false) => {
    if (!skipConfirm) {
      setModalConfig({
        isOpen: true,
        title: `Load ${template.name}?`,
        message: "Loading this algorithm will overwrite your current workspace. Do you want to continue?",
        confirmText: "Load Template",
        isDanger: false,
        onConfirmAction: () => {
          closeModal();
          executeLoadTemplate(template);
        }
      });
    } else {
      executeLoadTemplate(template);
    }
  };

  useEffect(() => {
    if (location.state) {
      setTimeout(() => {
        if (location.state.templatePath) {
          const t = SIDEBAR_TEMPLATES.find(x => x.path === location.state.templatePath);
          if (t) loadAlgorithmTemplate(t, true);
        }
        if (location.state.projectToLoad && workspaceRef.current) {
          workspaceRef.current.loadTemplate(location.state.projectToLoad.data);
          setCurrentProjectId(location.state.projectToLoad._id);
          setCurrentProjectTitle(location.state.projectToLoad.title);
          setViewMode("workspace");
        }
        window.history.replaceState({}, document.title);
      }, 300);
    }
    // eslint-disable-next-line
  }, [location.state]);

  const handleClear = () => {
    setModalConfig({
      isOpen: true,
      title: "Clear Workspace?",
      message: "Are you sure you want to clear the workspace? All unsaved progress will be lost.",
      confirmText: "Clear",
      isDanger: true,
      onConfirmAction: () => {
        closeModal();
        if (workspaceRef.current) {
          workspaceRef.current.clear();
          setGeneratedPython("# Drag blocks to generate Python code");
          setBlocklyJson(null);
          setAnalysisResult({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
          setBottomPanel(null);
          setExpandedLines({});
          setCurrentProjectId(null);
          setCurrentProjectTitle("Untitled Project");
        }
      }
    });
  };

  // --- NEW: Save Modal Trigger ---
  const openSaveModal = () => {
    if (!blocklyJson) {
      showToast("The workspace is empty. Nothing to save!", "error");
      return;
    }
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      showToast("You must be signed in to save templates to your account.", "error");
      return;
    }
    setSaveModal({
      isOpen: true,
      title: currentProjectTitle !== "Untitled Project" ? currentProjectTitle : "",
      description: ""
    });
  };

  // --- NEW: Submit Save Request ---
  const submitSaveTemplate = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const payload = {
      title: saveModal.title || "My Custom Template",
      description: saveModal.description || "A custom algorithm template.",
      data: blocklyJson,
      owner_id: user.email
    };

    try {
      let res;
      if (currentProjectId) {
        // Update an existing custom template
        res = await fetch(`/api/projects/${currentProjectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: blocklyJson, title: payload.title, description: payload.description }),
        });
      } else {
        // Clone a default template OR create a brand new one
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      const result = await res.json();
      if (res.ok) {
        showToast("Template saved to your library!", "success");
        if (!currentProjectId) setCurrentProjectId(result.id);
        setCurrentProjectTitle(payload.title);
        fetchUserTemplates(); // Refresh sidebar
      } else {
        showToast("Failed to save: " + (result.detail || "Error"), "error");
      }
    } catch (error) {
      showToast("Connection error while saving.", "error");
    }
    setSaveModal({ ...saveModal, isOpen: false });
  };

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console");
    setExpandedLines({});
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

  // Combine Default Templates with User's Custom Templates
  const allTemplates = [...userTemplates, ...SIDEBAR_TEMPLATES];
  const filteredTemplates = allTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="workspace-app-container">
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#E74C3C' : '#00b8a3',
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold', animation: 'fadeIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {/* Save Template Modal */}
      {saveModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#2A1B54', padding: '24px', borderRadius: '12px', width: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #4a4a4a', color: '#EBE4FF'
          }}>
            <h2 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.4rem'}}>Save to My Templates</h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#B8A0D6'}}>Template Name</label>
                <input 
                  type="text" 
                  value={saveModal.title} 
                  onChange={e => setSaveModal({...saveModal, title: e.target.value})}
                  placeholder="e.g. My Optimized Quick Sort"
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#1C1236', color: 'white', outline: 'none'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#B8A0D6'}}>Description</label>
                <textarea 
                  value={saveModal.description} 
                  onChange={e => setSaveModal({...saveModal, description: e.target.value})}
                  placeholder="What does this template do?"
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#1C1236', color: 'white', minHeight: '80px', outline: 'none', resize: 'vertical'}}
                />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px'}}>
              <button 
                onClick={() => setSaveModal({...saveModal, isOpen: false})} 
                style={{padding: '8px 16px', background: 'transparent', color: '#B8A0D6', border: '1px solid #B8A0D6', borderRadius: '6px', cursor: 'pointer'}}>
                Cancel
              </button>
              <button 
                onClick={submitSaveTemplate} 
                style={{padding: '8px 16px', background: '#00b8a3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        runCode={runCode}
        handleExport={openSaveModal}       // Replaced generic Export with specific Save trigger
        handleSaveToDB={openSaveModal}     // Replaced old prompt with custom Modal trigger
        currentProjectId={currentProjectId}
        currentProjectTitle={currentProjectTitle}
        handleUpdateDB={openSaveModal}     // Use the same modal flow for updating
      />

      <Split className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}>
        <aside className="templates-sidebar">
          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search Templates" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="sidebar-list">
            {filteredTemplates.map((template) => (
              <div key={template.name} className="sidebar-card" onClick={() => loadAlgorithmTemplate(template)}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h4>{template.name}</h4>
                  {template.isCustom && <span style={{fontSize: '0.7rem', background: '#00b8a3', color: 'white', padding: '2px 6px', borderRadius: '10px'}}>My Template</span>}
                </div>
                <p>{template.desc}</p>
              </div>
            ))}
            {filteredTemplates.length === 0 && <p className="no-results">No templates found.</p>}
          </div>
        </aside>

        <main className="workspace-main">
          <button className={`sidebar-toggle-btn ${!isSidebarVisible ? 'closed' : ''}`} onClick={() => setIsSidebarVisible(!isSidebarVisible)} title={isSidebarVisible ? "Hide Templates" : "Show Templates"}>
            <span className="toggle-icon">❮</span>
          </button>

          <div className="editor-container">
            <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
            </div>

            <div style={{ display: viewMode === 'python' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#1C1236' }}>
              <div style={{ padding: '10px 20px', background: '#2A1B54', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#EBE4FF', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  {isEditingCode ? "✏️ Unsaved code changes..." : "Code is synced with blocks."}
                </span>
                <button onClick={handleSyncToBlocks} disabled={!isEditingCode}
                  style={{ background: isEditingCode ? '#00b8a3' : '#4a4a4a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: isEditingCode ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                  Sync to Blocks ↻
                </button>
              </div>
              <textarea
                value={generatedPython}
                onChange={(e) => { setGeneratedPython(e.target.value); setIsEditingCode(true); }}
                spellCheck={false}
                style={{ flex: 1, margin: 0, padding: '20px', fontSize: '0.95rem', fontFamily: "'Fira Code', Consolas, Monaco, monospace", background: '#1C1236', color: '#EBE4FF', border: 'none', outline: 'none', resize: 'none', whiteSpace: 'pre', lineHeight: '1.5' }}
              />
            </div>
          </div>

          {bottomPanel && (
            <div className="bottom-hover-panel" style={{ height: `${panelHeight}px` }}>
              <div className="panel-resizer" onMouseDown={handleDragStart}><div className="resizer-dash"></div></div>
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
                        <span className="total-badge" style={{ backgroundColor: 'rgba(0, 184, 163, 0.15)', color: '#00b8a3', border: '1px solid rgba(0, 184, 163, 0.3)' }}>
                          <span className="total-label" style={{ color: '#00b8a3' }}>Total Space:</span> {analysisResult.space_total}
                        </span>
                      </div>
                    </div>
                    <div className="complexity-table-wrapper" style={{ overflowX: 'auto' }}>
                      <table className="complexity-table" style={{ width: '100%', minWidth: '800px', textAlign: 'left' }}>
                        <thead><tr><th>Line of Code</th><th>Operation</th><th>{activeTab === 'local' ? 'Local Time' : 'Global Time'}</th><th>{activeTab === 'local' ? 'Local Space' : 'Global Space'}</th></tr></thead>
                        <tbody>
                          {analysisResult.lines.map((row, i) => {
                            const explanationText = activeTab === 'local' ? row.local_explanation : row.global_explanation;
                            const graphComplexity = activeTab === 'local' ? row.local_time : row.global_time;
                            const graphLabel = activeTab === 'local' ? 'Local Complexity' : 'Global Complexity';
                            return (
                              <React.Fragment key={i}>
                                <tr className={`complexity-row ${expandedLines[i] ? 'expanded' : ''}`} onClick={() => toggleLine(i)} style={{ cursor: explanationText ? 'pointer' : 'default' }}>
                                  <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>{row.lineOfCode}</td>
                                  <td style={{ color: '#000000' }}>{row.operation || '-'}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>
                                    {formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}
                                    {explanationText && <span className="dropdown-chevron" style={{ marginLeft: '10px' }}>{expandedLines[i] ? '▼' : '▶'}</span>}
                                  </td>
                                </tr>
                                {expandedLines[i] && explanationText && (
                                  <tr className="explanation-row"><td colSpan="4"><div className="explanation-content" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}><div style={{ flex: 1 }}><img src="/assets/lightbulb-icon.png" alt="Lightbulb" className="tab-icon" /><p>{explanationText}</p></div><div style={{ minWidth: '200px' }}><ComplexityGraph complexity={graphComplexity} color={row.color} label={graphLabel} /></div></div></td></tr>
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
              <button className="footer-action-icon" onClick={handleClear} title="Clear Workspace"><img src="/assets/recursive-icon.png" alt="Refresh" /></button>
            </div>
          </footer>
        </main>
      </Split>

      <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} isDanger={modalConfig.isDanger} onCancel={closeModal} onConfirm={modalConfig.onConfirmAction} />
      <BigOModal isOpen={isBigOModalOpen} onClose={() => setIsBigOModalOpen(false)} />
    </div>
  );
}