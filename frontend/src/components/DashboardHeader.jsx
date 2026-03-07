/**
 * DashboardHeader Component
 *
 * This component renders the main header used across the dashboard pages
 * of the application. It provides navigation controls and quick actions
 * related to project management.
 *
 * The header contains three primary functional areas:
 *
 * 1. Branding Section
 *    Displays the application logo and name to maintain consistent identity.
 *
 * 2. Navigation Control
 *    Allows the user to quickly return to the main home page.
 *
 * 3. Project Actions
 *    Provides buttons for opening an existing project or creating a new one.
 *
 * React Router's navigation utilities are used to handle page transitions
 * without requiring full page reloads.
 */

import { Link, useNavigate } from "react-router-dom";

export default function DashboardHeader() {

  /**
   * useNavigate allows programmatic navigation between routes.
   * This is used by the "New Project" button to redirect users
   * directly into the Blockly application workspace.
   */
  const navigate = useNavigate();

  return (
    <header className="dashboard-header">

      {/* ------------------------------------------------------------------ */}
      {/* Left Section: Branding and Navigation                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="header-left">

        {/* Application Logo and Title */}
        <div className="logo-container">
          <img
            src="/assets/algoblocks_logo.png"
            alt="Logo"
            className="logo-img"
          />

          {/* Application Name */}
          <h1 className="logo-text" style={{ color: "#3C2D76" }}>
            ALGOBLOCKS
          </h1>
        </div>

        {/* Navigation link returning users to the homepage */}
        <Link to="/home" className="back-home">
          &gt; Back to Home
        </Link>

      </div>


      {/* ------------------------------------------------------------------ */}
      {/* Right Section: Project Controls and User Profile                   */}
      {/* ------------------------------------------------------------------ */}

      <div className="header-right">

        {/* 
          Open Project Button

          Intended to allow users to load an existing saved project.
          Currently functions as a visual UI element and can later be
          connected to a file picker or project loader system.
        */}
        <button className="btn-open-project">
          <img
            src="/assets/folder-icon.png"
            alt="Open Project"
            className="btn-icon-open"
          />
          Open Project
        </button>


        {/*
          New Project Button

          Navigates the user to the Blockly workspace where a new
          algorithm project can be created.
        */}
        <button
          className="btn-new-project"
          onClick={() => navigate("/app")}
        >
          + New Project
        </button>


        {/*
          User Profile Icon

          Placeholder visual indicator representing the current user.
          This can later be expanded to include a dropdown menu for:
            • account settings
            • profile management
            • logout functionality
        */}
        <div className="user-profile-icon">👤</div>

      </div>

    </header>
  );
}