/**
 * WorkspaceHeader Component
 *
 * This component renders the top header of the AlgoBlocks workspace page.
 * It provides navigation, view toggling between Workspace and Python code,
 * and action buttons for running and saving projects.
 *
 * Props:
 * - viewMode: string ('workspace' | 'python') representing the current view.
 * - setViewMode: function to switch between workspace and Python code views.
 * - runCode: function to execute the current workspace code.
 * - handleExport: function to export the current project as a JSON file.
 * - handleSaveToDB: function to save the current project to MongoDB.
 */

import { useNavigate } from "react-router-dom";

export default function WorkspaceHeader({ 
  viewMode, 
  setViewMode, 
  runCode, 
  handleExport,
  handleSaveToDB,
  currentProjectId,       // NEW
  currentProjectTitle,    // NEW
  handleUpdateDB          // NEW
}) {

  const navigate = useNavigate();

  return (
    <header className="workspace-header">
      <div className="header-left">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <img src="/assets/back-icon.png" alt="Back" className="btn-icon" /> 
          Back to Dashboard
        </button>
        {/* Update this span to use the dynamic title */}
        <span className="project-name">{currentProjectTitle}</span> 
      </div>

      <div className="header-center">
         {/* ... (Keep your existing view-toggle buttons here) ... */}
      </div>

      <div className="header-right">
        <button onClick={runCode} className="action-btn btn-run">
          <img src="/assets/play-icon.png" alt="Run" className="btn-icon" /> Run
        </button>

        <button onClick={handleExport} className="action-btn btn-save">
          Export
        </button>

        {/* Conditionally render "Save Changes" if a project is loaded, otherwise show "Save to Cloud" */}
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