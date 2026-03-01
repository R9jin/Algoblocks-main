import { useNavigate } from "react-router-dom";

export default function WorkspaceHeader({ 
  viewMode, 
  setViewMode, 
  runCode, 
  setBottomPanel, 
  handleSave 
}) {
  const navigate = useNavigate();

  return (
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
          <button 
            className={`toggle-btn ${viewMode === 'workspace' ? 'active' : ''}`} 
            onClick={() => setViewMode("workspace")}
          >
            Workspace
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'python' ? 'active' : ''}`} 
            onClick={() => setViewMode("python")}
          >
            Python Code
          </button>
        </div>
      </div>
      
      <div className="header-right">
        <button onClick={runCode} className="action-btn btn-run">
          <img src="/assets/play-icon.png" alt="Run" className="btn-icon" /> Run
        </button>
        <button onClick={() => setBottomPanel("complexity")} className="action-btn btn-analyze">
          <img src="/assets/complexity-icon.png" alt="Analyze" className="btn-icon" /> Analyze
        </button>
        <button onClick={handleSave} className="action-btn btn-save">
          Sign in to save
        </button>
      </div>
    </header>
  );
}