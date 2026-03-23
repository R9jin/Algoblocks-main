import { useNavigate } from "react-router-dom";

export default function WorkspaceHeader({
  viewMode,
  setViewMode,
  runCode,
  handleExport,
  handleSaveToDB,
  currentProjectId,
  currentProjectTitle,
  handleUpdateDB,
  codingMode  // NEW: expects 'blocks' | 'manual'
}) {
  const navigate = useNavigate();

  return (
    <header className="workspace-header">
      <div className="header-left">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <img src="/assets/back-icon.png" alt="Back" className="btn-icon" />
          Back to Dashboard
        </button>
        <span className="project-name">{currentProjectTitle}</span>
      </div>

      <div className="header-center">
        <div className="view-toggle">
          {codingMode === 'blocks' && (
            <div className="workspace-toggle-group">
              <button
                className={`workspace-toggle-btn ${viewMode === 'workspace' ? 'active' : ''}`}
                onClick={() => setViewMode('workspace')}
              >
                Workspace
              </button>
              <button
                className={`workspace-toggle-btn ${viewMode === 'python' ? 'active' : ''}`}
                onClick={() => setViewMode('python')}
              >
                Python Code
              </button>
            </div>
          )}

          {codingMode === 'manual' && (
            <div className="workspace-toggle-group" style={{ color: '#EBE4FF', fontWeight: 'bold' }}>
              Python IDE Mode
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <button onClick={runCode} className="action-btn btn-run">
          <img src="/assets/play-icon.png" alt="Run" className="btn-icon" /> Run
        </button>

        <button onClick={handleExport} className="action-btn btn-save">
          Export
        </button>

        {currentProjectId ? (
          <button onClick={handleUpdateDB} className="action-btn btn-save" style={{ backgroundColor: '#27ae60', color: 'white' }}>
            Save Changes
          </button>
        ) : (
          <button onClick={handleSaveToDB} className="action-btn btn-save">
            Save to Cloud
          </button>
        )}
      </div>
    </header>
  );
}