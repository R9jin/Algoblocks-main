import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BlocklyWorkspace from "../components/BlocklyWorkspace";
import WorkspaceHeader from "../components/WorkspaceHeader";
import "../styles/MainApp.css";

const ActivityApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the activity data passed from LearningPath
  const activityData = location.state?.activityData || null;
  const initialTemplate = location.state?.templatePath || "";

  const [generatedPython, setGeneratedPython] = useState("");
  const [consoleOutput, setConsoleOutput] = useState("> Ready to run activity tests...\n");
  const [bottomPanel, setBottomPanel] = useState("console"); // "console" or "python"

  // Redirect back if accessed without activity data
  useEffect(() => {
    if (!activityData) {
      navigate("/learning-path");
    }
  }, [activityData, navigate]);

  if (!activityData) return null;

  const handleWorkspaceChange = (pythonCode) => {
    setGeneratedPython(pythonCode);
  };

  const runTestCases = async () => {
    if (!activityData.testCasesList) return;
    
    setConsoleOutput("> Running Tests...\n");
    setBottomPanel("console");
  
    let testHarness = `\n\n# --- System Test Cases ---\nprint("\\n--- Running Test Cases ---")\n`;
    testHarness += `passed = 0\ntotal = ${activityData.testCasesList.length}\n`;
    
    activityData.testCasesList.forEach((tc, index) => {
      testHarness += `
try:
    assert ${tc.call} == ${tc.expected}
    print("Test ${index + 1} Passed: ${tc.call} == ${tc.expected}")
    passed += 1
except AssertionError:
    print("Test ${index + 1} Failed: ${tc.call} did not equal ${tc.expected}")
except Exception as e:
    print("Test ${index + 1} Error:", e)
`;
    });
    testHarness += `print(f"\\nResult: {passed}/{total} Tests Passed")\n`;
  
    const codeToRun = generatedPython + testHarness;
  
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToRun }),
      });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch {
      setConsoleOutput("> Connection Error while running tests.");
    }
  };

  const handleExit = () => {
    // Confirm exit to prevent accidental loss of progress
    if (window.confirm("Are you sure you want to exit? Your progress will not be saved.")) {
      navigate("/learning-path");
    }
  };

  return (
    <div className="main-app-container">
      <WorkspaceHeader />
      <div className="workspace-layout">
        
        {/* Activity Sidebar */}
        <aside className="templates-sidebar activity-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff' }}>
          <div className="activity-header" style={{ marginBottom: '15px', borderBottom: '2px solid #EBE4FF', paddingBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#3A2A6B' }}>{activityData.title || activityData.topic}</h3>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#7F57F9', color: 'white', padding: '3px 8px', borderRadius: '12px' }}>
              {activityData.level}
            </span>
          </div>
          
          <div className="activity-instructions" style={{ flex: 1, overflowY: 'auto', fontSize: '0.9rem', color: '#444' }}>
            <strong>Your Mission:</strong>
            <p>{activityData.task || "Complete the algorithm to pass the test cases."}</p>
            
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#F5EFFF', borderRadius: '8px', border: '1px solid #BCA1FC' }}>
              <strong>Test Cases to Pass:</strong>
              <ul style={{ paddingLeft: '20px', margin: '10px 0 0 0' }}>
                {activityData.testCasesList?.map((tc, i) => (
                  <li key={i} style={{fontFamily: 'monospace', margin: '5px 0'}}>{tc.call} ➔ {tc.expected}</li>
                ))}
              </ul>
            </div>
          </div>

          <button 
            onClick={runTestCases}
            style={{ marginTop: '15px', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            Submit & Run Tests
          </button>
          
          <button 
            onClick={handleExit}
            style={{ marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Exit Activity
          </button>
        </aside>

        {/* Workspace and Console Area */}
        <main className="workspace-main">
          <div className="blockly-container">
            <BlocklyWorkspace 
              onWorkspaceChange={handleWorkspaceChange} 
              templatePath={initialTemplate} 
            />
          </div>

          {/* Bottom Panel (Console / Python Code) */}
          <div className="bottom-panel">
            <div className="bottom-panel-header">
              <button 
                className={`panel-tab ${bottomPanel === "console" ? "active" : ""}`}
                onClick={() => setBottomPanel("console")}
              >
                Console
              </button>
              <button 
                className={`panel-tab ${bottomPanel === "python" ? "active" : ""}`}
                onClick={() => setBottomPanel("python")}
              >
                Python Code
              </button>
            </div>
            <div className="bottom-panel-content">
              {bottomPanel === "console" ? (
                <pre className="console-output">{consoleOutput}</pre>
              ) : (
                <pre className="python-output">{generatedPython}</pre>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ActivityApp;