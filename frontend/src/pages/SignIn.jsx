import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import "../styles/Auth.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sign in with", email, password);
    navigate("/home");
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
