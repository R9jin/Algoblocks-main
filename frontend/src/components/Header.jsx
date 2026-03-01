import { Link } from "react-router-dom";

export default function Header() {
  return (
    <nav className="landing-nav">
      <div className="logo-container">
        <img src="./assets/algoblocks_logo.png" alt="AlgoBlocks Logo" className="logo-img" />
        <h1 className="logo-text">ALGOBLOCKS</h1>
      </div>

      <div className="nav-links">
        <Link to="/signin" className="nav-btn signin">Sign In</Link>
        <Link to="/app" className="nav-btn signup">Start Learning</Link>
      </div>
    </nav>
  );
}