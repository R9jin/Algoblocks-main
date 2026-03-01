import { Link, useNavigate } from "react-router-dom";

export default function DashboardHeader() {
  const navigate = useNavigate();

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo-container">
          <img src="/assets/algoblocks_logo.png" alt="Logo" className="logo-img" />
          <h1 className="logo-text" style={{color: '#3C2D76'}}>ALGOBLOCKS</h1>
        </div>
        <Link to="/" className="back-home">&gt; Back to Home</Link>
      </div>
      
      <div className="header-right">
        <button className="btn-open-project">📁 Open Project</button>
        <button className="btn-new-project" onClick={() => navigate('/app')}>+ New Project</button>
        <div className="user-profile-icon">👤</div>
      </div>
    </header>
  );
}