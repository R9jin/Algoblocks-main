import { Link } from "react-router-dom";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} AlgoBlocks. All rights reserved.</p>
        </div>
    </footer>
  );
}