import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import LandingPage from "./pages/HomePage";
import LearningPath from "./pages/LearningPath"; // <-- 1. Import it here
import MainApp from "./pages/MainApp";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/learning-path" element={<LearningPath />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/app" element={<MainApp />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;