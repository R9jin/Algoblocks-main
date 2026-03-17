import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader"; // <-- Import the new header
import "../styles/Dashboard.css";

const TEMPLATES = {
  sorting: [
    {
      name: "Bubble Sort",
      path: "sort/bubble_sort",
      desc: "Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted. Simple but inefficient for large datasets.",
      icon: "/assets/sort-icon.png"
    },
    {
      name: "Selection Sort",
      path: "sort/selection_sort",
      desc: "Divides the input list into two parts: a sorted sublist and an unsorted sublist. It repeatedly selects the smallest element from the unsorted sublist and swaps it with the leftmost unsorted element.",
      icon: "/assets/sort-icon.png"
    },
    {
      name: "Insertion Sort",
      path: "sort/insertion_sort",
      desc: "Builds the final sorted array one item at a time. It iterates through the input elements, growing a sorted array behind it by comparing the current element to the largest value in the sorted array.",
      icon: "/assets/sort-icon.png"
    },
    {
      name: "Merge Sort",
      path: "sort/merge_sort",
      desc: "A highly efficient divide-and-conquer algorithm that recursively splits the list into halves until each sublist contains one element, then merges those sublists to produce new sorted sublists.",
      icon: "/assets/sort-icon.png"
    }
  ],
  searching: [
    {
      name: "Linear Search",
      path: "search/linear_search",
      desc: "Checks every element in the list sequentially until the desired element is found or the list ends. It is straightforward and works on unsorted lists, but has an O(n) time complexity.",
      icon: "/assets/search-icon.png"
    },
    {
      name: "Binary Search",
      path: "search/binary_search",
      desc: "Finds the position of a target value within a sorted array by repeatedly dividing the search interval in half. Very efficient with an O(log n) time complexity, but requires the array to be sorted first.",
      icon: "/assets/search-icon.png"
    }
  ],
  recursive: [
    {
      name: "Factorial",
      path: "recursive/recursive_factorial",
      desc: "Calculates the factorial of a non-negative integer using a recursive function where n! = n * (n-1)!, with the base case of 0! = 1. A classic example of mathematical recursion.",
      icon: "/assets/recursive-icon.png"
    },
    {
      name: "Fibonacci",
      path: "recursive/recursive_fibonacci",
      desc: "Generates the Fibonacci sequence where each number is the sum of the two preceding ones. This template uses a standard recursive approach to compute the nth Fibonacci number.",
      icon: "/assets/recursive-icon.png"
    },
    {
      name: "Permutation",
      path: "recursive/recursive_permutation",
      desc: "Generates all possible arrangements of a given set of characters or items. Uses a recursive backtracking algorithm to systematically explore and build different permutations.",
      icon: "/assets/recursive-icon.png"
    }
  ]
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects to populate the Recent Projects sidebar
  useEffect(() => {
    const fetchRecentProjects = async () => {
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
          // Reverse to show the newest first, and take only the top 5
          setRecentProjects(userProjects.reverse().slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch recent projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentProjects();
  }, []);

  // Handle opening pre-made templates
  const handleTemplateClick = (template) => {
    const confirmStart = window.confirm(`Do you want to start a new project using the "${template.name}" template? Any unsaved progress in your current workspace will be lost.`);

    if (confirmStart) {
      navigate("/app", { state: { templatePath: template.path } });
    }
  };

  // Handle opening a saved project from MongoDB
  const handleOpenProject = (project) => {
    navigate('/app', { state: { projectToLoad: project } });
  };

  return (
    <div className="dashboard-container">

      {/* 1. Insert the reusable header component here */}
      <DashboardHeader />

      {/* BODY */}
      <div className="dashboard-body">
        <main className="dashboard-main">

          <div className="learning-path-banner" onClick={() => navigate('/learning-path')}>
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

          <div className="algorithm-library-grid">

            {/* Sorting Column */}
            <div className="algorithm-column">
              <h3 className="column-title">SORTING</h3>
              {TEMPLATES.sorting.map((temp) => (
                <div key={temp.name} className="algorithm-card">
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <div className="card-hover-content">
                    <p className="template-card-desc">{temp.desc}</p>
                    <button className="try-template-btn" onClick={() => handleTemplateClick(temp)}>
                      Test Template →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Searching Column */}
            <div className="algorithm-column">
              <h3 className="column-title">SEARCHING</h3>
              {TEMPLATES.searching.map((temp) => (
                <div key={temp.name} className="algorithm-card">
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <div className="card-hover-content">
                    <p className="template-card-desc">{temp.desc}</p>
                    <button className="try-template-btn" onClick={() => handleTemplateClick(temp)}>
                      Test Template →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recursive Column */}
            <div className="algorithm-column">
              <h3 className="column-title">RECURSIVE</h3>
              {TEMPLATES.recursive.map((temp) => (
                <div key={temp.name} className="algorithm-card">
                  <div className="card-header">
                    <img src={temp.icon} alt={temp.name} className="card-icon-img" />
                    <h4>{temp.name}</h4>
                  </div>
                  <div className="card-hover-content">
                    <p className="template-card-desc">{temp.desc}</p>
                    <button className="try-template-btn" onClick={() => handleTemplateClick(temp)}>
                      Test Template →
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </main>

        <aside className="dashboard-sidebar">
          <h3 className="sidebar-label">RECENT PROJECTS</h3>
          {loading ? (
            <div className="empty-projects-box">Loading...</div>
          ) : recentProjects.length === 0 ? (
            <div className="empty-projects-box">No recent projects yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {recentProjects.map(proj => (
                <div
                  key={proj._id}
                  style={{
                    backgroundColor: '#2A1F4C',
                    padding: '15px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3B2D6C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2A1F4C'}
                  onClick={() => handleOpenProject(proj)}
                >
                  <div style={{ fontWeight: 'bold', color: '#EBE4FF', marginBottom: '4px' }}>{proj.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#A594DC' }}>Saved to Cloud</div>
                </div>
              ))}
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}