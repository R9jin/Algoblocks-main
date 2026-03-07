import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { FiLock, FiMail } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Send a POST request to your FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem("user", JSON.stringify({
          email: data.email,
          name: data.name,
          progress: data.progress || {} // <-- Add this
        }));

        navigate("/home");
      } else {
        // If backend returns a 401 error, show an alert
        alert("Invalid email or password. Please try again.");
      }
    } catch (error) {
      console.error("Error connecting to server:", error);
      alert("Failed to connect to the server.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign In to AlgoBlocks</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="auth-input-wrap">
              <FiMail className="auth-input-icon" aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="auth-input-wrap">
              <FiLock className="auth-input-icon" aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>
          <button type="submit" className="auth-button">Sign In</button>
        </form>
        <div className="social-auth">
          <div className="social-divider">
            <span>Or sign in with</span>
          </div>
          <div className="social-buttons">
            <button type="button" className="social-btn">
              <FcGoogle className="social-icon" aria-hidden="true" />
              Google
            </button>
            <button type="button" className="social-btn">
              <FaGithub className="social-icon" aria-hidden="true" />
              GitHub
            </button>
          </div>
        </div>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <p>Don't have an account?<Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
