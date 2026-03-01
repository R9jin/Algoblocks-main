import { Link, useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

// 1. Add the "icon" property to your templates
const TEMPLATES = {
  sorting: [
    { name: "Bubble Sort", path: "sort/bubble_sort", desc: "Repeatedly swaps adjacent elements...", icon: "/assets/sort-icon.png" },
    { name: "Selection Sort", path: "sort/selection_sort", desc: "Finds the minimum element...", icon: "/assets/sort-icon.png" },
    { name: "Insertion Sort", path: "sort/insertion_sort", desc: "Builds the final sorted array...", icon: "/assets/sort-icon.png" },
    { name: "Merge Sort", path: "sort/merge_sort", desc: "Divides array into halves...", icon: "/assets/sort-icon.png" }
  ],
  searching: [
    { name: "Linear Search", path: "search/linear_search", desc: "Checks every element...", icon: "/assets/search-icon.png" },
    { name: "Binary Search", path: "search/binary_search", desc: "Finds element in sorted array...", icon: "/assets/search-icon.png" }
  ],
  recursive: [
    { name: "Factorial", path: "recursive/recursive_factorial", desc: "Calculates the factorial...", icon: "/assets/recursive-icon.png" },
    { name: "Fibonacci", path: "recursive/recursive_fibonacci", desc: "Generates the Fibonacci...", icon: "/assets/recursive-icon.png" },
    { name: "Permutation", path: "recursive/recursive_permutation", desc: "Generates all permutations...", icon: "/assets/recursive-icon.png" }
  ]
};

export default function Dashboard() {
  const navigate = useNavigate();

  const handleTemplateClick = (template) => {
    const confirmStart = window.confirm(`Do you want to start a new project using the "${template.name}" template? Any unsaved progress in your current workspace will be lost.`);
    
    if (confirmStart) {
      navigate("/app", { state: { templatePath: template.path } });
    }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER (unchanged) */}
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

      <div className="dashboard-body">
        <main className="dashboard-main">
          
          {/* 2. Replace Banner Emoji with Image */}
          <div className="learning-path-banner">
            <div className="banner-icon">
              <img src="/assets/learning-icon.png" alt="Learning Path" />
            </div>
            <div className="banner-text">
              <h2>Learning Path</h2>
              <p>Structured lessons - master algorithms step-by-step</p>
            </div>
            <div className="banner-arrow">&gt;</div>
          </div>

          <h1 className="section-title">Pre-made Templates</h1>

          {/* 3. Replace Card Emojis with Images mapped from the dictionary */}
          <div className="template-category">
            <h3 className="category-label">SORTING ALGORITHMS</h3>
            <div className="template-grid">
              {TEMPLATES.sorting.map((temp) => (
                <div key={temp.name} className="template-card" onClick={() => handleTemplateClick(temp)}>
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <p>{temp.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="template-category">
            <h3 className="category-label">SEARCHING ALGORITHMS</h3>
            <div className="template-grid">
              {TEMPLATES.searching.map((temp) => (
                <div key={temp.name} className="template-card" onClick={() => handleTemplateClick(temp)}>
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <p>{temp.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="template-category">
            <h3 className="category-label">RECURSIVE ALGORITHMS</h3>
            <div className="template-grid">
              {TEMPLATES.recursive.map((temp) => (
                <div key={temp.name} className="template-card" onClick={() => handleTemplateClick(temp)}>
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <p>{temp.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </main>

        <aside className="dashboard-sidebar">
          <h3 className="sidebar-label">RECENT PROJECTS</h3>
          <div className="empty-projects-box">
            No recent projects yet.
          </div>
        </aside>
      </div>
    </div>
  );
}