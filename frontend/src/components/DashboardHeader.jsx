import { Link, useNavigate } from "react-router-dom";

export default function DashboardHeader() {
  const navigate = useNavigate();

  return (
    <header className="dashboard-header">

      <div className="header-left">
        <div className="logo-container">
          <img
            src="/assets/algoblocks_logo.png"
            alt="Logo"
            className="logo-img"
          />
          <h1 className="logo-text" style={{ color: "#3C2D76" }}>
            ALGOBLOCKS
          </h1>
        </div>
        <Link to="/home" className="back-home">
          &gt; Back to Home
        </Link>
      </div>

      <div className="header-right">

        {/* Updated: Now navigates to the Projects page */}
        <button 
          className="btn-open-project" 
          onClick={() => navigate("/projects")}
        >
          <img
            src="/assets/folder-icon.png"
            alt="Open Project"
            className="btn-icon-open"
          />
          Open Project
        </button>

        {/* Still correctly navigates to a blank workspace */}
        <button
          className="btn-new-project"
          onClick={() => navigate("/app")}
        >
          + New Project
        </button>

        <div className="user-profile-icon">👤</div>

      </div>

    </header>
  );
}