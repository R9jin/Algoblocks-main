import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BlocklyWorkspace from "../components/BlocklyWorkspace";
import WorkspaceHeader from "../components/WorkspaceHeader";
import "../styles/MainApp.css";

const ActivityApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const activityData = location.state?.activityData || null;
  const initialTemplate = location.state?.templatePath || "";

  const [generatedPython, setGeneratedPython] = useState("");
  // Start with a blank console output
  const [consoleOutput, setConsoleOutput] = useState(""); 
  // State to trigger the Console Pop-Up
  const [isConsoleOpen, setIsConsoleOpen] = useState(false); 

  useEffect(() => {
    if (!activityData) navigate("/learning-path");
  }, [activityData, navigate]);

  if (!activityData) return null;

  const handleWorkspaceChange = (pythonCode) => {
    setGeneratedPython(pythonCode);
  };

  const runTestCases = async () => {
    if (!activityData.testCasesList) return;
    
    // Open the pop-up when tests start running
    setIsConsoleOpen(true);
    setConsoleOutput("> Running Tests...\n");
  
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

  return (
    <div className="main-app-container">
      <WorkspaceHeader />
      <div className="workspace-layout">
        
        {/* Activity Panel */}
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
            style={{ marginTop: '15px', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Submit & Run Tests
          </button>
          
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to exit? Your progress will not be saved.")) {
                navigate("/learning-path");
              }
            }}
            style={{ marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Exit Activity
          </button>
        </aside>

        <main className="workspace-main" style={{ position: 'relative' }}>
          <div className="blockly-container">
            <BlocklyWorkspace onWorkspaceChange={handleWorkspaceChange} templatePath={initialTemplate} />
          </div>

          {/* Figma-style Console Pop-Up */}
          {isConsoleOpen && (
            <div className="console-popup" style={{
              position: 'absolute', bottom: '20px', right: '20px', left: '20px',
              backgroundColor: '#1E1E1E', color: '#00FF00', borderRadius: '8px',
              boxShadow: '0 -4px 15px rgba(0,0,0,0.5)', zIndex: 1000,
              display: 'flex', flexDirection: 'column', maxHeight: '40%'
            }}>
              <div style={{ padding: '10px 15px', backgroundColor: '#333', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#FFF' }}>Console Output</strong>
                <button 
                  onClick={() => setIsConsoleOpen(false)} 
                  style={{ background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✖
                </button>
              </div>
              <div style={{ padding: '15px', overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {consoleOutput}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ActivityApp;