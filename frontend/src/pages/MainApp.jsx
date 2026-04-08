import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Split from "react-split";
import BigOModal from "../components/BigOModal.jsx";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import WorkspaceHeader from "../components/WorkspaceHeader.jsx";
import "../styles/MainApp.css";
import { formatComplexity } from "../utils/formatters";

export default function MainApp() {
  const location = useLocation();
  const workspaceRef = useRef(null);

  const [analysisResult, setAnalysisResult] = useState({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);

  const [viewMode, setViewMode] = useState("workspace");
  const [bottomPanel, setBottomPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // --- Core State Variables ---
  const [sidebarTab, setSidebarTab] = useState("templates"); // 'templates' | 'projects'
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  
  const [currentLoadedId, setCurrentLoadedId] = useState(null);
  const [currentLoadedType, setCurrentLoadedType] = useState(null); // 'project' | 'template'
  const [currentProjectTitle, setCurrentProjectTitle] = useState("Untitled Project");

  // --- UI States ---
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [saveModal, setSaveModal] = useState({ isOpen: false, title: "", description: "", saveType: "project" });
  const [activeTab, setActiveTab] = useState("local");
  const [expandedLines, setExpandedLines] = useState({});
  const [isBigOModalOpen, setIsBigOModalOpen] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", confirmText: "Confirm", isDanger: false, onConfirmAction: null });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  const [panelHeight, setPanelHeight] = useState(450);
  const isDragging = useRef(false);
  const [isEditingCode, setIsEditingCode] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // --- Fetch Data from Backend ---
  const fetchData = async () => {
    try {
      // 1. Fetch Global System Templates
      const tRes = await fetch('/api/templates');
      const tData = await tRes.json();
      if (tData.status === 'success') setSystemTemplates(tData.templates || []);

      // 2. Fetch User's Personal Projects
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const pRes = await fetch('/api/projects');
        const pData = await pRes.json();
        if (pData.status === 'success') {
          setUserProjects(pData.projects.filter(p => p.owner_id === user.email) || []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Sidebar Resize Logic ---
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
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pythonCode }) });
      const data = await response.json();
      if (data.status === "success") {
        setAnalysisResult({ total: data.total, space_total: data.space_total || "O(1)", lines: data.lines || [], is_recursive: data.is_recursive || false });
      }
    } catch (error) { console.error("Analysis Error:", error); }
  };

  // --- Load Item from Sidebar ---
  const executeLoadItem = (item, type) => {
    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      setCurrentLoadedId(item._id);
      setCurrentLoadedType(type);
      setCurrentProjectTitle(item.title);

      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(item.data);
        setViewMode("workspace");
      }
    } catch (error) {
      showToast(`Failed to load ${type}`, "error");
    }
  };

  const loadItemConfirm = (item, type) => {
    setModalConfig({
      isOpen: true, title: `Load ${item.title}?`, message: "Loading this will overwrite your current workspace. Continue?",
      confirmText: "Load", isDanger: false,
      onConfirmAction: () => { closeModal(); executeLoadItem(item, type); }
    });
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
          setCurrentLoadedId(null); setCurrentLoadedType(null); setCurrentProjectTitle("Untitled Project");
        }
      }
    });
  };

  // --- Delete Item from Sidebar ---
  const handleDeleteItem = async (e, id, type) => {
    e.stopPropagation(); // Prevents loading the item when clicking the trash can
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const res = await fetch(`/api/${type}s/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`${type} deleted!`, "success");
        fetchData();
        if (currentLoadedId === id) handleClear(); // Reset workspace if they delete what they are currently viewing
      } else {
        showToast(`Failed to delete ${type}`, "error");
      }
    } catch(e) {
      showToast("Connection error", "error");
    }
  };

  // --- Unified Save Modal Trigger ---
  const openSaveModal = () => {
    if (!blocklyJson) { showToast("The workspace is empty. Nothing to save!", "error"); return; }
    
    // Default the dropdown to what they are currently viewing, otherwise default to "project"
    const defaultType = currentLoadedType || "project";

    setSaveModal({
      isOpen: true, 
      title: currentProjectTitle !== "Untitled Project" ? currentProjectTitle : "", 
      description: "", 
      saveType: defaultType
    });
  };

  // --- Submit Unified Save Request ---
  const submitSave = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (saveModal.saveType === 'project' && !user) {
      showToast("You must be signed in to save personal projects.", "error"); return;
    }

    const endpoint = saveModal.saveType === 'project' ? '/api/projects' : '/api/templates';
    
    const payload = {
      title: saveModal.title || "Untitled",
      description: saveModal.description || "",
      data: blocklyJson,
      ...(saveModal.saveType === 'project' && { owner_id: user.email })
    };

    // If they are editing the same type, update it. If they loaded a Template but select "Save as Project", it clones a NEW project.
    const isUpdate = currentLoadedId && currentLoadedType === saveModal.saveType;

    try {
      let res;
      if (isUpdate) {
        res = await fetch(`${endpoint}/${currentLoadedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      
      if (res.ok) {
        const result = await res.json();
        showToast(`${saveModal.saveType} saved!`, "success");
        setCurrentLoadedId(isUpdate ? currentLoadedId : result.id);
        setCurrentLoadedType(saveModal.saveType);
        setCurrentProjectTitle(payload.title);
        fetchData(); // Refresh the sidebar
      } else {
        showToast("Failed to save", "error");
      }
    } catch (error) {
      showToast("Connection error.", "error");
    }
    setSaveModal({ ...saveModal, isOpen: false });
  };

  // --- Quick Update (Button in Header) ---
  const handleUpdateDB = async () => {
    if (!blocklyJson || !currentLoadedId || !currentLoadedType) return;
    const endpoint = currentLoadedType === 'project' ? '/api/projects' : '/api/templates';
    try {
      const res = await fetch(`${endpoint}/${currentLoadedId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: blocklyJson }),
      });
      if (res.ok) showToast("Changes saved successfully!", "success");
      else showToast("Failed to save changes", "error");
    } catch (e) {
      showToast("Error saving changes.", "error");
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

  // Filter Active Tab List
  const activeList = sidebarTab === 'templates' ? systemTemplates : userProjects;
  const filteredList = activeList.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="workspace-app-container">
      {/* Toast Notification */}
      {toast.show && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#E74C3C' : '#00b8a3', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold' }}>
          {toast.message}
        </div>
      )}

      {/* Unified Save Modal */}
      {saveModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#2A1B54', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #4a4a4a', color: '#EBE4FF' }}>
            <h2 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.4rem'}}>Save Workspace</h2>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#B8A0D6'}}>Save Destination</label>
                <select 
                  value={saveModal.saveType} 
                  onChange={e => setSaveModal({...saveModal, saveType: e.target.value})}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#1C1236', color: 'white', outline: 'none', cursor: 'pointer'}}
                >
                  <option value="project">My Personal Project</option>
                  <option value="template">System Pre-Made Template</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#B8A0D6'}}>Title</label>
                <input type="text" value={saveModal.title} onChange={e => setSaveModal({...saveModal, title: e.target.value})} placeholder="e.g. Optimized Quick Sort" style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#1C1236', color: 'white', outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#B8A0D6'}}>Description</label>
                <textarea value={saveModal.description} onChange={e => setSaveModal({...saveModal, description: e.target.value})} placeholder="What does this code do?" style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#1C1236', color: 'white', minHeight: '80px', outline: 'none', resize: 'vertical'}} />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px'}}>
              <button onClick={() => setSaveModal({...saveModal, isOpen: false})} style={{padding: '8px 16px', background: 'transparent', color: '#B8A0D6', border: '1px solid #B8A0D6', borderRadius: '6px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitSave} style={{padding: '8px 16px', background: '#00b8a3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Confirm Save</button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceHeader
        viewMode={viewMode} setViewMode={setViewMode} runCode={runCode}
        handleExport={openSaveModal} 
        handleSaveToDB={openSaveModal} 
        currentProjectId={currentLoadedId} // Tells the header if "Save Changes" should be active
        currentProjectTitle={currentProjectTitle}
        handleUpdateDB={handleUpdateDB}
      />

      <Split className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}>
        
        {/* NEW TABS SIDEBAR */}
        <aside className="templates-sidebar" style={{display: 'flex', flexDirection: 'column'}}>
          <div style={{ display: 'flex', borderBottom: '1px solid #4a4a4a' }}>
            <button 
              onClick={() => setSidebarTab('templates')} 
              style={{ flex: 1, padding: '12px 0', background: sidebarTab === 'templates' ? '#2A1B54' : 'transparent', color: sidebarTab === 'templates' ? '#00b8a3' : '#B8A0D6', border: 'none', borderBottom: sidebarTab === 'templates' ? '2px solid #00b8a3' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              System Templates
            </button>
            <button 
              onClick={() => setSidebarTab('projects')} 
              style={{ flex: 1, padding: '12px 0', background: sidebarTab === 'projects' ? '#2A1B54' : 'transparent', color: sidebarTab === 'projects' ? '#00b8a3' : '#B8A0D6', border: 'none', borderBottom: sidebarTab === 'projects' ? '2px solid #00b8a3' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              My Projects
            </button>
          </div>

          <div className="sidebar-search" style={{ margin: '15px' }}>
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="sidebar-list" style={{flex: 1, overflowY: 'auto'}}>
            {filteredList.map((item) => (
              <div key={item._id} className="sidebar-card" onClick={() => loadItemConfirm(item, sidebarTab === 'templates' ? 'template' : 'project')}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h4>{item.title}</h4>
                  <button onClick={(e) => handleDeleteItem(e, item._id, sidebarTab === 'templates' ? 'template' : 'project')} style={{background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px'}} title="Delete">
                    🗑️
                  </button>
                </div>
                <p>{item.description}</p>
              </div>
            ))}
            {filteredList.length === 0 && <p className="no-results">No items found in {sidebarTab === 'templates' ? 'System Templates' : 'My Projects'}.</p>}
          </div>
        </aside>

        <main className="workspace-main">
          <button className={`sidebar-toggle-btn ${!isSidebarVisible ? 'closed' : ''}`} onClick={() => setIsSidebarVisible(!isSidebarVisible)} title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}>
            <span className="toggle-icon">❮</span>
          </button>

          <div className="editor-container">
            <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
            </div>

            <div style={{ display: viewMode === 'python' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#1C1236' }}>
              <div style={{ padding: '10px 20px', background: '#2A1B54', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#EBE4FF', fontSize: '0.9rem', fontStyle: 'italic' }}>{isEditingCode ? "✏️ Unsaved code changes..." : "Code is synced with blocks."}</span>
                <button onClick={handleSyncToBlocks} disabled={!isEditingCode} style={{ background: isEditingCode ? '#00b8a3' : '#4a4a4a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: isEditingCode ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                  Sync to Blocks ↻
                </button>
              </div>
              <textarea value={generatedPython} onChange={(e) => { setGeneratedPython(e.target.value); setIsEditingCode(true); }} spellCheck={false} style={{ flex: 1, margin: 0, padding: '20px', fontSize: '0.95rem', fontFamily: "'Fira Code', Consolas, Monaco, monospace", background: '#1C1236', color: '#EBE4FF', border: 'none', outline: 'none', resize: 'none', whiteSpace: 'pre', lineHeight: '1.5' }} />
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
                        <span className="total-badge" style={{ backgroundColor: 'rgba(0, 184, 163, 0.15)', color: '#00b8a3', border: '1px solid rgba(0, 184, 163, 0.3)' }}><span className="total-label" style={{ color: '#00b8a3' }}>Total Space:</span> {analysisResult.space_total}</span>
                      </div>
                    </div>
                    <div className="complexity-table-wrapper" style={{ overflowX: 'auto' }}>
                      <table className="complexity-table" style={{ width: '100%', minWidth: '800px', textAlign: 'left' }}>
                        <thead><tr><th>Line of Code</th><th>Operation</th><th>{activeTab === 'local' ? 'Local Time' : 'Global Time'}</th><th>{activeTab === 'local' ? 'Local Space' : 'Global Space'}</th></tr></thead>
                        <tbody>
                          {analysisResult.lines.map((row, i) => {
                            const explanationText = activeTab === 'local' ? row.local_explanation : row.global_explanation;
                            return (
                              <React.Fragment key={i}>
                                <tr className={`complexity-row ${expandedLines[i] ? 'expanded' : ''}`} onClick={() => toggleLine(i)} style={{ cursor: explanationText ? 'pointer' : 'default' }}>
                                  <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>{row.lineOfCode}</td>
                                  <td style={{ color: '#000000' }}>{row.operation || '-'}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>{formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}</td>
                                </tr>
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
              <button className="footer-tab" onClick={() => setIsBigOModalOpen(true)} style={{ color: '#ffffff', fontWeight: 'bold' }}><img src="/assets/table-icon.png" alt="Reference" className="tab-icon" /> Big O Reference</button>
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