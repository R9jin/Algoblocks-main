/**
 * Header Component
 *
 * This component renders the primary navigation bar for the landing page
 * of the AlgoBlocks application. It serves two main purposes:
 *
 * 1. Branding
 *    Displays the AlgoBlocks logo and application name to establish
 *    a consistent visual identity across the interface.
 *
 * 2. Navigation
 *    Provides quick access for users to sign in or begin using the
 *    learning workspace.
 *
 * React Router's Link component is used to enable client-side navigation
 * without triggering a full page reload.
 */

import { Link } from "react-router-dom";

export default function Header() {
  return (
    /**
     * Navigation container representing the landing page header.
     * Layout and visual styling are handled by the associated CSS classes.
     */
    <nav className="landing-nav">

      {/* ------------------------------------------------------------------ */}
      {/* Logo and Application Branding                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="logo-container">
        <img
          src="./assets/algoblocks_logo.png"
          alt="AlgoBlocks Logo"
          className="logo-img"
        />

        {/* Application name displayed beside the logo */}
        <h1 className="logo-text">ALGOBLOCKS</h1>
      </div>


      {/* ------------------------------------------------------------------ */}
      {/* Navigation Links                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div className="nav-links">

        {/*
          Sign In Link

          Redirects existing users to the authentication page
          where they can access their accounts.
        */}
        <Link to="/signin" className="nav-btn signin">
          Sign In
        </Link>

        {/*
          Start Learning Link

          Directs users to the main application workspace where
          they can begin building and analyzing algorithms using
          the AlgoBlocks environment.
        */}
        <Link to="/app" className="nav-btn signup">
          Start Learning
        </Link>

      </div>

    </nav>
  );
}