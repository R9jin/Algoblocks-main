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
  handleSaveToDB
}) {

  /** React Router navigation helper */
  const navigate = useNavigate();

  return (
    /**
     * Main header container for the workspace interface.
     * CSS classes define layout and styling.
     */
    <header className="workspace-header">

      {/* -------------------------------------------------------------- */}
      {/* Left Section: Back Navigation & Project Name                  */}
      {/* -------------------------------------------------------------- */}

      <div className="header-left">

        {/*
          Back button to return to the dashboard.
          Uses an image icon and text for clear navigation affordance.
        */}
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <img src="/assets/back-icon.png" alt="Back" className="btn-icon" /> 
          Back to Dashboard
        </button>

        {/* Displays the current project name */}
        <span className="project-name">Untitled Project</span>

      </div>


      {/* -------------------------------------------------------------- */}
      {/* Center Section: View Toggle (Workspace / Python Code)        */}
      {/* -------------------------------------------------------------- */}

      <div className="header-center">
        <div className="view-toggle">

          {/*
            Workspace view toggle button.
            Highlights as active when the current viewMode matches.
          */}
          <button 
            className={`toggle-btn ${viewMode === 'workspace' ? 'active' : ''}`} 
            onClick={() => setViewMode("workspace")}
          >
            Workspace
          </button>

          {/*
            Python Code view toggle button.
            Highlights as active when the current viewMode matches.
          */}
          <button 
            className={`toggle-btn ${viewMode === 'python' ? 'active' : ''}`} 
            onClick={() => setViewMode("python")}
          >
            Python Code
          </button>

        </div>
      </div>


      {/* -------------------------------------------------------------- */}
      {/* Right Section: Action Buttons (Run / Export / Save)          */}
      {/* -------------------------------------------------------------- */}

      <div className="header-right">

        {/*
          Run button to execute the code in the current workspace.
          Uses an icon for quick recognition.
        */}
        <button onClick={runCode} className="action-btn btn-run">
          <img src="/assets/play-icon.png" alt="Run" className="btn-icon" /> Run
        </button>

        {/*
          Export button triggers project download functionality.
        */}
        <button onClick={handleExport} className="action-btn btn-save">
          Export
        </button>

        {/*
          Save button triggers project save to MongoDB.
          Requires sign in.
        */}
        <button onClick={handleSaveToDB} className="action-btn btn-save">
          Save to Cloud
        </button>

      </div>

    </header>
  );
}