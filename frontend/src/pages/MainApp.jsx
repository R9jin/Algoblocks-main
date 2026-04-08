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

// --- Base System Templates (Hardcoded paths for local JSON files) ---
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
  const workspaceRef = useRef(null);

  // --- UI & Analysis States ---
  const [analysisResult, setAnalysisResult] = useState({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  const [viewMode, setViewMode] = useState("workspace");
  const [bottomPanel, setBottomPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // --- Unified Template List State ---
  const [allTemplates, setAllTemplates] = useState([]);
  const [currentLoadedId, setCurrentLoadedId] = useState(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("Untitled Project");

  // --- Modals & Notifications ---
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [saveModal, setSaveModal] = useState({ isOpen: false, title: "", description: "" });
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", confirmText: "Confirm", isDanger: false, onConfirmAction: null });
  const [isBigOModalOpen, setIsBigOModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const [expandedLines, setExpandedLines] = useState({});
  const toggleLine = (index) => setExpandedLines(prev => ({ ...prev, [index]: !prev[index] }));
  
  const [panelHeight, setPanelHeight] = useState(450);
  const isDragging = useRef(false);
  const [isEditingCode, setIsEditingCode] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  // --- Resizing Bottom Panel Logic ---
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
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  const handleDragStart = (e) => { e.preventDefault(); isDragging.current = true; document.body.style.cursor = "ns-resize"; document.body.style.userSelect = "none"; };

  // --- Fetch Combined Templates: System First, then User's Custom Templates ---
  const fetchTemplates = async () => {
    try {
      // 1. Map internal system templates to standard format
      const baseTemplates = SIDEBAR_TEMPLATES.map(t => ({
        ...t,
        title: t.name,
        description: t.desc,
        isSystem: true
      }));

      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setAllTemplates(baseTemplates);
        return;
      }
      
      const user = JSON.parse(storedUser);

      // 2. Fetch user's custom templates from the DB
      const res = await fetch('/api/projects');
      const data = await res.json();
      
      if (data.status === 'success') {
        const userTemplates = data.projects
          .filter(p => p.owner_id === user.email)
          .map(p => ({
            _id: p._id,
            title: p.title,
            description: p.description || "Custom saved template",
            isSystem: false,
            data: p.data
          }));
        
        // Render System templates first, then append User templates to the end
        setAllTemplates([...baseTemplates, ...userTemplates]);
      } else {
        setAllTemplates(baseTemplates);
      }
    } catch (e) {
      console.error("Failed to load templates", e);
      setAllTemplates(SIDEBAR_TEMPLATES.map(t => ({ ...t, title: t.name, description: t.desc, isSystem: true })));
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // --- Loading Logic ---
  const executeLoad = async (item) => {
    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      let json;

      if (item.isSystem) {
        const response = await fetch(`/templates/${item.path}.json`);
        if (!response.ok) throw new Error("Template not found");
        json = await response.json();
        setCurrentLoadedId(null); // Treat as new if user saves it later
      } else {
        json = item.data;
        setCurrentLoadedId(item._id);
      }

      setCurrentProjectTitle(item.title);
      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
        setViewMode("workspace");
      }
    } catch (error) {
      showToast("Failed to load template", "error");
    }
  };

  const loadConfirm = (item) => {
    setModalConfig({
      isOpen: true,
      title: `Load ${item.title}?`,
      message: "This will overwrite your current workspace. Continue?",
      confirmText: "Load Template",
      isDanger: false,
      onConfirmAction: () => {
        closeModal();
        executeLoad(item);
      }
    });
  };

  // --- Workspace Actions ---
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
    } catch (e) { console.error("Analysis Error:", e); }
  };

  const handleSyncToBlocks = () => {
    if (workspaceRef.current && generatedPython) {
      workspaceRef.current.loadFromPython(generatedPython);
      setIsEditingCode(false);
      setViewMode("workspace");
      showToast("Code successfully synced to Blocks");
    }
  };

  const handleClear = () => {
    setModalConfig({
      isOpen: true, title: "Clear Workspace?", message: "Are you sure you want to clear? All unsaved progress will be lost.",
      confirmText: "Clear", isDanger: true,
      onConfirmAction: () => {
        closeModal();
        if (workspaceRef.current) {
          workspaceRef.current.clear();
          setGeneratedPython("# Drag blocks to generate Python code");
          setBlocklyJson(null);
          setAnalysisResult({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
          setBottomPanel(null); setExpandedLines({});
          setCurrentLoadedId(null); setCurrentProjectTitle("Untitled Project");
        }
      }
    });
  };

  const openSaveModal = () => {
    if (!blocklyJson) { showToast("The workspace is empty. Nothing to save!", "error"); return; }
    setSaveModal({ isOpen: true, title: currentProjectTitle !== "Untitled Project" ? currentProjectTitle : "", description: "" });
  };

  const submitSave = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      showToast("You must be signed in to save.", "error"); return;
    }
    const user = JSON.parse(storedUser);

    const payload = {
      title: saveModal.title || "My Custom Template",
      description: saveModal.description || "",
      data: blocklyJson,
      owner_id: user.email
    };

    try {
      let res;
      if (currentLoadedId) {
        res = await fetch(`/api/projects/${currentLoadedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      if (res.ok) {
        const result = await res.json();
        showToast("Template saved!", "success");
        if (!currentLoadedId && result.id) setCurrentLoadedId(result.id);
        setCurrentProjectTitle(payload.title);
        fetchTemplates(); // Refresh the list to show new user template at the end
      } else {
        showToast("Failed to save", "error");
      }
    } catch (e) { showToast("Error saving.", "error"); }
    setSaveModal({ ...saveModal, isOpen: false });
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Template deleted!", "success");
        fetchTemplates();
        if (currentLoadedId === id) handleClear(); 
      } else {
        showToast("Failed to delete", "error");
      }
    } catch(e) {
      showToast("Connection error", "error");
    }
  };

  const runCode = async () => {
    setConsoleOutput("> Running..."); setBottomPanel("console"); setExpandedLines({});
    try {
      const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: generatedPython }) });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch { setConsoleOutput("> Connection Error"); }
  };

  const filteredTemplates = allTemplates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="workspace-app-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      {/* Save Modal */}
      {saveModal.isOpen && (
        <div className="modal-overlay">
          <div className="save-modal-content">
            <h2 className="save-modal-title">Save Custom Template</h2>
            <div className="save-modal-form">
              <div>
                <label className="save-modal-label">Template Name</label>
                <input 
                  type="text" 
                  value={saveModal.title} 
                  onChange={e => setSaveModal({...saveModal, title: e.target.value})} 
                  placeholder="e.g. My Optimized Sort" 
                  className="save-modal-input" 
                />
              </div>
              <div>
                <label className="save-modal-label">Description</label>
                <textarea 
                  value={saveModal.description} 
                  onChange={e => setSaveModal({...saveModal, description: e.target.value})} 
                  placeholder="What does this do?" 
                  className="save-modal-textarea" 
                />
              </div>
            </div>
            <div className="save-modal-actions">
              <button onClick={() => setSaveModal({...saveModal, isOpen: false})} className="save-modal-cancel-btn">Cancel</button>
              <button onClick={submitSave} className="save-modal-confirm-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceHeader
        viewMode={viewMode} setViewMode={setViewMode} runCode={runCode}
        handleExport={openSaveModal} 
        handleSaveToDB={openSaveModal} 
        currentProjectId={currentLoadedId} 
        currentProjectTitle={currentProjectTitle}
        handleUpdateDB={submitSave} // Unified saving flow
      />

      <Split className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}>
        
        {/* Templates Sidebar */}
        <aside className="templates-sidebar">

          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search templates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="sidebar-list">
            {filteredTemplates.map((item) => (
              <div key={item._id || item.title} className="sidebar-card" onClick={() => loadConfirm(item)}>
                <div className="sidebar-card-header">
                  <h4>{item.title}</h4>
                  
                  {item.isSystem ? (
                    <span className="badge-system">System</span>
                  ) : (
                    <div className="badge-custom-group">
                      <span className="badge-custom">Custom</span>
                      <button onClick={(e) => handleDeleteItem(e, item._id)} className="sidebar-delete-btn" title="Delete">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <p>{item.description}</p>
              </div>
            ))}
            {filteredTemplates.length === 0 && <p className="no-results">No templates found.</p>}
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="workspace-main">
          <button className={`sidebar-toggle-btn ${!isSidebarVisible ? 'closed' : ''}`} onClick={() => setIsSidebarVisible(!isSidebarVisible)} title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}>
            <span className="toggle-icon">❮</span>
          </button>

          <div className="editor-container">
            <div className={viewMode === 'workspace' ? 'workspace-view d-block' : 'workspace-view d-none'}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
            </div>

            <div className={viewMode === 'python' ? 'python-view d-flex' : 'python-view d-none'}>
              <div className="python-header">
                <span className="python-sync-status">{isEditingCode ? "✏️ Unsaved code changes..." : "Code is synced with blocks."}</span>
                <button 
                  onClick={handleSyncToBlocks} 
                  disabled={!isEditingCode} 
                  className={`python-sync-btn ${isEditingCode ? 'active' : 'disabled'}`}
                >
                  Sync to Blocks ↻
                </button>
              </div>
              <textarea 
                value={generatedPython} 
                onChange={(e) => { setGeneratedPython(e.target.value); setIsEditingCode(true); }} 
                spellCheck={false} 
                className="python-textarea" 
              />
            </div>
          </div>

          {/* Bottom Panel (Console & Complexity) */}
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
                    <div className="complexity-tabs">
                      <div className="tab-btn-group">
                        <button onClick={() => { setActiveTab("local"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}>Local Complexity</button>
                        <button onClick={() => { setActiveTab("global"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}>Global Complexity</button>
                      </div>
                      <div className="total-badge-group">
                        <span className="total-badge"><span className="total-label">Total Time:</span> {analysisResult.total}</span>
                        <span className="total-badge space"><span className="total-label space">Total Space:</span> {analysisResult.space_total}</span>
                      </div>
                    </div>
                    <div className="complexity-table-wrapper">
                      <table className="complexity-table">
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
                                  <td className="operation-cell">{row.operation || '-'}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>
                                    {formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}
                                    {explanationText && <span className="dropdown-chevron">{expandedLines[i] ? '▼' : '▶'}</span>}
                                  </td>
                                </tr>
                                
                                {expandedLines[i] && explanationText && (
                                  <tr className="explanation-row">
                                    <td colSpan="4">
                                      <div className="explanation-content">
                                        <div className="explanation-text">
                                          <img src="/assets/lightbulb-icon.png" alt="Lightbulb" className="tab-icon explanation-icon" />
                                          <p>{explanationText}</p>
                                        </div>
                                        <div className="explanation-graph">
                                          <ComplexityGraph complexity={graphComplexity} color={row.color} label={graphLabel} />
                                        </div>
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
              <button className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}><img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console</button>
              <button className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}><img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity</button>
              <button className="footer-tab big-o-btn" onClick={() => setIsBigOModalOpen(true)}><img src="/assets/table-icon.png" alt="Reference" className="tab-icon" /> Big O Reference</button>
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