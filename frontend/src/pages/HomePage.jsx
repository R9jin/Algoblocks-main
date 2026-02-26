import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <h1 className="logo">ALGOBLOCKS</h1>
        <div className="nav-links">
          <Link to="/signin" className="nav-btn signin">Sign In</Link>
          <Link to="/app" className="nav-btn signup">Start Learning</Link>
        </div>
      </nav>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero">
          <h1 className="gradient-text">
            Think in Steps.<br />Analyze in Depth.
          </h1>
          <p className="hero-subtitle">
            Build algorithms with interactive blocks and<br />
            get line-by-line feedback on time and space<br />
            performance in real-time.
          </p>
          <div className="hero-buttons">
            <Link to="/app" className="btn-primary">Launch Playground →</Link>
            <button className="btn-secondary">Watch Demo</button>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="feature-cards">
          <h2>Built for Granular Learning</h2>
          <p className="section-subtitle">
            AlgoBlocks bridges the gap between abstract computer science concepts and tangible coding experience.
          </p>
          <div className="cards-grid">
            <div className="card">
              <div className="card-icon">🧩</div>
              <h3>Block-Based Logic</h3>
              <p>Construct complex algorithms using our intuitive drag-and-drop interface. Perfect for beginners and advanced visual learners.</p>
            </div>
            <div className="card">
              <div className="card-icon">📊</div>
              <h3>Line-by-Line Feedback</h3>
              <p>Get instant time and space complexity metrics for every block you place. Understand the why behind the performance.</p>
            </div>
            <div className="card">
              <div className="card-icon">🐍</div>
              <h3>Python Conversion</h3>
              <p>Automatically convert your visual blocks into clean, production-ready Python source code with a single toggle.</p>
            </div>
          </div>
        </section>

        {/* Everything You Need Section */}
        <section className="features-list">
          <div className="features-content">
            <h2>Everything You Need to Learn Algorithms</h2>
            <ul>
              <li>Built-in algorithm templates with real Python code</li>
              <li>Instant code generation from your block arrangements</li>
              <li>Line-by-line complexity analysis with O-notation</li>
              <li>Save and manage your projects</li>
            </ul>
          </div>
          <div className="code-snippet">
            <pre>
              <code>
{`def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]: # O(1) compare
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr # Overall: O(n²)`}
              </code>
            </pre>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
      </footer>
    </div>
  );
}