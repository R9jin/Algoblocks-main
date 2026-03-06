import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import "../styles/Auth.css";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sign up with", name, email, password);
    // Changed this line to route to dashboard
    navigate("/dashboard"); 
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <FiUser className="auth-input-icon" aria-hidden="true" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>
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
          <button type="submit" className="auth-button">Sign Up</button>
        </form>
        <div className="social-auth">
          <div className="social-divider">
            <span>Or sign up with</span>
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
          <p>Already have an account?<Link to="/signin">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
