import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import "../styles/Projects.css";

const DUMMY_PROJECTS = [
  { id: 1, name: "My Bubble Sort Test", date: "Oct 24, 2023", size: "12 KB" },
  { id: 2, name: "Recursive Fib Opt", date: "Oct 22, 2023", size: "8 KB" },
  { id: 3, name: "Homework Assignment 1", date: "Oct 15, 2023", size: "24 KB" }
];

export default function Projects() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <DashboardHeader />
      
      <div className="page-body">
        <main className="page-main">
          <div className="page-header-row">
            <div>
              <h1 className="section-title" style={{ marginBottom: '5px' }}>My Projects</h1>
              <p className="page-subtitle">Manage and load your saved algorithm workspaces.</p>
            </div>
            <button className="btn-new-project-large" onClick={() => navigate('/app')}>
              + Blank Workspace
            </button>
          </div>

          <div className="projects-grid">
            {DUMMY_PROJECTS.map(proj => (
              <div key={proj.id} className="project-card">
                <div className="project-icon-wrapper">
                  <img src="/assets/folder-icon.png" alt="Folder" className="project-folder-icon" />
                </div>
                <div className="project-details">
                  <h3>{proj.name}</h3>
                  <p>Saved: {proj.date} • {proj.size}</p>
                </div>
                <div className="project-actions">
                  <button className="btn-open" onClick={() => navigate('/app')}>Open →</button>
                  <button className="btn-delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}