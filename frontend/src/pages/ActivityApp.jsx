import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BlocklyWorkspace from "../components/BlocklyWorkspace";
import "../styles/ActivityApp.css";

import Split from "react-split";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ActivityApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const activityData = location.state?.activityData || null;
  const initialTemplate = location.state?.templatePath || "";

  const workspaceRef = useRef(null);

  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState(""); 
  const [viewMode, setViewMode] = useState("workspace");
  const [passedTests, setPassedTests] = useState(0);

  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

  // --- NEW: State to track which test cases are expanded (default to opening the first one) ---
  const [expandedTests, setExpandedTests] = useState({ 0: true });

  const [bottomPanel, setBottomPanel] = useState(null); 
  const [activeTab, setActiveTab] = useState("time_asymptotic");
  const [analysisResult, setAnalysisResult] = useState({ 
    lines: [], recurrence_lines: [], total: "O(1)", total_recurrence: "O(1)", space_lines: [], space_total: "O(1)", is_recursive: false
  });

  const [panelHeight, setPanelHeight] = useState(300);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY - 48; 
      if (newHeight >= 150 && newHeight <= window.innerHeight - 150) {
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragStart = (e) => {
    e.preventDefault(); 
    isDragging.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!activityData) navigate("/learning-path");
  }, [activityData, navigate]);

  const loadActivityTemplate = async (path) => {
    try {
      const fetchUrl = path.startsWith("activities/") 
        ? `/${path}.json` 
        : `/templates/${path}.json`;
        
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`Template not found at ${fetchUrl}`);
      
      const json = await response.json();
      
      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
      }
    } catch (error) {
      console.error("Failed to load activity template:", error);
    }
  };

  useEffect(() => {
    if (initialTemplate) {
      setTimeout(() => {
        loadActivityTemplate(initialTemplate);
      }, 300);
    }
  }, [initialTemplate]);

  const handleWorkspaceChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    
    try {
      const response = await fetch('/api/analyze', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pythonCode })
      });
      const data = await response.json();
      if (data.status === "success") {
        setAnalysisResult({ 
          total: data.total, 
          total_recurrence: data.total_recurrence || data.total,
          lines: data.lines,
          recurrence_lines: data.recurrence_lines || [],
          space_total: data.space_total || "O(1)",
          space_lines: data.space_lines || [],
          is_recursive: data.is_recursive || false
        });
        setActiveTab(prev => (prev === 'time_recurrence' && !data.is_recursive) ? 'time_asymptotic' : prev);
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  const runTestCases = async () => {
    if (!activityData.testCasesList) return;
    
    setBottomPanel("console");
    setConsoleOutput("> Running Tests...\n");
    setPassedTests(0); 
  
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
      
      const outputText = data.status === "success" ? data.output : "> Error: " + data.output;
      setConsoleOutput(outputText);

      const match = outputText.match(/Result: (\d+)\//);
      if (match) {
        setPassedTests(parseInt(match[1]));
      }

      // Automatically expand all failed test cases for easy debugging
      const newExpanded = { ...expandedTests };
      activityData.testCasesList.forEach((tc, i) => {
        if (outputText.includes(`Test ${i + 1} Failed`) || outputText.includes(`Test ${i + 1} Error`)) {
          newExpanded[i] = true;
        }
      });
      setExpandedTests(newExpanded);

    } catch {
      setConsoleOutput("> Connection Error while running tests.");
    }
  };

  // --- NEW: Toggle function for dropdowns ---
  const toggleTest = (index) => {
    setExpandedTests(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const totalTests = activityData?.testCasesList?.length || 0;

  if (!activityData) return null;

  return (
    <div className="activity-app-container">
      
      <header className="activity-topbar">
        <div className="activity-back-btn" onClick={() => navigate('/learning-path')}>
          <span>›</span> Back to Dashboard
        </div>
        
        <div className="activity-toggle-group">
          <button 
            className={`activity-toggle-btn ${viewMode === 'workspace' ? 'active' : ''}`} 
            onClick={() => setViewMode('workspace')}
          >
            Workspace
          </button>
          <button 
            className={`activity-toggle-btn ${viewMode === 'python' ? 'active' : ''}`} 
            onClick={() => setViewMode('python')}
          >
            Python Code
          </button>
        </div>
        
        <div className="activity-actions">
          <button className="activity-action-btn run-btn" onClick={runTestCases}>
            ▶ Run Tests
          </button>
        </div>
      </header>

      <Split 
        className={`activity-main-layout ${!isLeftPanelVisible ? 'left-hidden' : ''}`}
        sizes={[25, 50, 25]}
        minSize={[isLeftPanelVisible ? 250 : 0, 400, 250]} 
        gutterSize={8}
      >
        
        <aside className="activity-left-panel">
          <div className="activity-panel-header">
            <h2>
              <img src="/assets/learning-icon.png" alt="Icon" style={{ width: '24px' }}/>
              {activityData.title}
            </h2>
          </div>
          
          <div className="activity-panel-content">
            <h3 className="activity-section-title">
              <img src="/assets/book-icon.png" alt="Theory" style={{ width: '18px' }}/> THEORY
            </h3>
            <div className="activity-card">
              <p>{activityData.teaching}</p>
              <span className="activity-card-subtitle">KEY CONCEPTS:</span>
              <pre>{activityData.algorithmSteps}</pre>
            </div>

            <h3 className="activity-section-title">TASK</h3>
            <div className="activity-card">
              {activityData.task}
            </div>
          </div>
        </aside>

        <main className="workspace-main activity-center-panel">
          
          <button 
            className={`sidebar-toggle-btn ${!isLeftPanelVisible ? 'closed' : ''}`}
            onClick={() => setIsLeftPanelVisible(!isLeftPanelVisible)}
            title={isLeftPanelVisible ? "Hide Instructions" : "Show Instructions"}
          >
            <span className="toggle-icon">{isLeftPanelVisible ? '❮' : '❯'}</span>
          </button>

          <div className="editor-container" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleWorkspaceChange} templatePath={initialTemplate} />
            </div>
            
            <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#1C1236', overflow: 'auto' }}>
              <SyntaxHighlighter 
                language="python" 
                style={shadesOfPurple}
                showLineNumbers={true}
                customStyle={{
                  margin: 0, padding: '20px', fontSize: '0.95rem',
                  fontFamily: "'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
                  background: '#1C1236', color: '#EBE4FF', minHeight: '100%'
                }}
              >
                {generatedPython}
              </SyntaxHighlighter>
            </div>
          </div>

          {bottomPanel && (
            <div className="bottom-hover-panel" style={{ height: `${panelHeight}px` }}>
              <div className="panel-resizer" onMouseDown={handleDragStart}>
                <div className="resizer-dash"></div>
              </div>
              
              <div className="panel-header">
                <span className="panel-title">{bottomPanel === 'console' ? 'Console Output' : 'Complexity Analysis'}</span>
                <button onClick={() => setBottomPanel(null)} className="panel-close-btn">✕</button>
              </div>
              
              <div className="panel-body">
                {bottomPanel === 'console' ? (
                  <pre className="console-output">{consoleOutput}</pre>
                ) : (
                  <div className="complexity-content">
                    <div className="complexity-tabs">
                      <button
                        onClick={() => setActiveTab("time")}
                        className={`tab-btn ${activeTab === 'time' ? 'active' : ''}`}>
                        Time Complexity
                      </button>
                      <button
                        onClick={() => setActiveTab("space")}
                        className={`tab-btn ${activeTab === 'space' ? 'active' : ''}`}>
                        Space Complexity
                      </button>
                      <span className="total-badge">
                        <span className="total-label">Total:</span>{" "}
                        {activeTab === "space" ? analysisResult.space_total : analysisResult.total}
                      </span>
                    </div>
                    
                    <div className="complexity-table-wrapper">
                      <table className="complexity-table">
                        <thead>
                          <tr>
                            <th>Line of Code</th>
                            <th className="right-align">Complexity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeTab === 'time' ? analysisResult.lines : analysisResult.space_lines).map((row, i) => (
                            <tr key={i}>
                              <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>
                                {row.lineOfCode}
                              </td>
                              <td className="complexity-cell" style={{ color: row.color || 'white' }}>{row.complexity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <footer className="workspace-footer">
            <div className="footer-left">
              <button 
                className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`}
                onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}
              >
                <img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console
              </button>
              <button 
                className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`}
                onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}
              >
                <img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity
              </button>
            </div>
            
            <div className="footer-right">
               <button className="footer-action-icon" onClick={() => {
                 if (window.confirm("Are you sure you want to restart this activity? Your progress will be lost.")) {
                   window.location.reload();
                 }
               }} title="Restart Activity">
                 <img src="/assets/recursive-icon.png" alt="Restart" />
               </button>
            </div>
          </footer>

        </main>

        {/* --- UPDATED: Test Cases Panel with Collapsible UI --- */}
        <aside className="activity-right-panel">
          <div className="activity-panel-header">
            <h3>Test Cases</h3>
            <span className="test-cases-counter">{passedTests}/{totalTests} passed</span>
          </div>
          
          <div className="activity-panel-content">
            {activityData.testCasesList?.map((tc, i) => {
              // 1. Detect Status
              const testIdentifier = `Test ${i + 1}`;
              const isPassing = consoleOutput.includes(`${testIdentifier} Passed`);
              const isFailing = consoleOutput.includes(`${testIdentifier} Failed`);
              const isError = consoleOutput.includes(`${testIdentifier} Error`);
              
              // 2. State & Styling Setup
              const isExpanded = expandedTests[i];
              const statusClass = isPassing ? 'passing' : (isFailing || isError) ? 'failing' : '';

              return (
                <div key={i} className={`test-case-card ${statusClass}`}>
                  
                  {/* Clickable Header Dropdown Toggle */}
                  <div className="test-case-header" onClick={() => toggleTest(i)}>
                    <div className="test-case-header-left">
                      <div className={`test-case-indicator ${statusClass}`}></div>
                      <strong className="test-case-title">Test {i + 1}</strong>
                    </div>
                    <span className={`test-case-chevron ${isExpanded ? 'open' : ''}`}>❯</span>
                  </div>
                  
                  {/* Collapsible Code Content */}
                  {isExpanded && (
                    <div className="test-case-details">
                      <div className="test-case-row">
                        <span className="test-case-label">Input:</span>
                        <code className="test-case-code">{tc.call}</code>
                      </div>
                      <div className="test-case-row">
                        <span className="test-case-label">Expected Output:</span>
                        <code className="test-case-code">{tc.expected}</code>
                      </div>
                      
                      {/* Show immediate status inside if run */}
                      {(isPassing || isFailing || isError) && (
                        <div className="test-case-status-row">
                          <span className="test-case-label">Result:</span>
                          <span style={{ fontWeight: 'bold', color: isPassing ? '#27AE60' : '#e74c3c' }}>
                            {isPassing ? 'Passed' : isFailing ? 'Failed (Incorrect Output)' : 'Failed (Syntax Error)'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                </div>
              );
            })}
          </div>
        </aside>

      </Split>
    </div>
  );
};

export default ActivityApp;