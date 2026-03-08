import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import "../styles/Projects.css";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setLoading(false);
        return; // User is not signed in
      }
      
      const user = JSON.parse(storedUser);

      try {
        const response = await fetch("/api/projects");
        const result = await response.json();
        
        if (response.ok && result.status === "success") {
          // Filter projects so the user only sees their own
          const userProjects = result.projects.filter(p => p.owner_id === user.email);
          setProjects(userProjects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleOpenProject = (project) => {
    // Navigate to MainApp and pass the project JSON data in the state
    navigate('/app', { state: { projectToLoad: project } });
  };

  const handleDeleteProject = async (projectId) => {
    // Confirm with the user before deleting permanently
    const confirmDelete = window.confirm("Are you sure you want to delete this project? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok && result.status === "success") {
        // Update local state to remove the deleted project from the grid immediately
        setProjects(projects.filter(p => p._id !== projectId));
      } else {
        alert(result.detail || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("An error occurred while deleting the project.");
    }
  };

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

          {loading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <p>You have no saved projects yet.</p>
          ) : (
            <div className="projects-grid">
              {projects.map(proj => (
                <div key={proj._id} className="project-card">
                  <div className="project-icon-wrapper">
                    <img src="/assets/folder-icon.png" alt="Folder" className="project-folder-icon" />
                  </div>
                  <div className="project-details">
                    <h3>{proj.title}</h3>
                    <p>Saved to Cloud</p>
                  </div>
                  <div className="project-actions">
                    <button className="btn-open" onClick={() => handleOpenProject(proj)}>Open →</button>
                    {/* Add the onClick handler to the delete button, passing the project's unique ID */}
                    <button className="btn-delete" onClick={() => handleDeleteProject(proj._id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}