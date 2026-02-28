import { useRef, useState } from "react";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";

export default function MainApp() {
  const [analysisResult, setAnalysisResult] = useState({ 
    lines: [], 
    recurrence_lines: [],
    total: "O(1)",
    total_recurrence: "O(1)",
    space_lines: [],
    space_total: "O(1)",
    is_recursive: false
  });
  const [activeTab, setActiveTab] = useState("time_asymptotic");
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  
  const [viewMode, setViewMode] = useState("workspace"); 
  const [bottomPanel, setBottomPanel] = useState(null);

  const workspaceRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleBlocklyChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    setBlocklyJson(json);
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
        
        // Prevent getting stuck on the Recurrence tab if a new algorithm isn't recursive 
        setActiveTab(prev => (prev === 'time_recurrence' && !data.is_recursive) ? 'time_asymptotic' : prev);
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  const loadAlgorithmTemplate = async (path) => {
    const confirmOverwrite = window.confirm(
      "Loading this algorithm will overwrite your current workspace. Any unsaved progress will be lost. Do you want to continue?"
    );

    if (!confirmOverwrite) {
      return;
    }

    try {
      const response = await fetch(`/templates/${path}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();
      if (workspaceRef.current) {
        const newCode = workspaceRef.current.loadTemplate(json);
        handleBlocklyChange(json, newCode);
        setViewMode("workspace");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the workspace? All unsaved progress will be lost.")) {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
        setGeneratedPython("# Drag blocks to generate Python code");
        setBlocklyJson(null);
        setAnalysisResult({ 
          lines: [], 
          recurrence_lines: [],
          total: "O(1)",
          total_recurrence: "O(1)",
          space_lines: [],
          space_total: "O(1)",
          is_recursive: false
        });
        setActiveTab("time_asymptotic");
      }
    }
  };

  const handleSave = () => {
    const projectName = window.prompt("Enter a name for your project file:", "my_algorithm");
    
    if (projectName) {
      if (!blocklyJson) {
        alert("The workspace is empty. Nothing to save!");
        return;
      }

      const jsonString = JSON.stringify(blocklyJson, null, 2);
      
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console");
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedPython }),
      });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch {
      setConsoleOutput("> Connection Error");
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a', overflow: 'hidden' }}>
      {/* HEADER */}
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '60px', borderBottom: '1px solid #4830A0' }}>
        
        {/* Left Side: Logo & Workspace Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '1.2rem', color: '#E058FB', margin: 0 }}>ALGOBLOCKS</h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} className="save-button" style={{ padding: '6px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: '#3498db', color: 'white', fontWeight: 'bold' }}>
              💾 Save
            </button>
            <button onClick={handleClear} style={{ padding: '6px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: '#e74c3c', color: 'white', fontWeight: 'bold' }}>
              🗑️ Clear
            </button>
          </div>
        </div>
        
        {/* Center: View Modes & Run */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setViewMode("workspace")} style={{ padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: viewMode === 'workspace' ? '#7F57F9' : '#34495e', color: 'white' }}>📂 Workspace</button>
          <button onClick={() => setViewMode("python")} style={{ padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: viewMode === 'python' ? '#7F57F9' : '#34495e', color: 'white' }}>🐍 Python Code</button>
          <button onClick={runCode} style={{ padding: '8px 25px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold' }}>▶ RUN</button>
        </div>
        
        {/* Right Side: Complexity */}
        <div className="complexity-badge" style={{ color: '#00ff00', fontWeight: 'bold' }}>
          Total: {activeTab === 'space' ? analysisResult.space_total : 
                  activeTab === 'time_recurrence' ? analysisResult.total_recurrence : 
                  analysisResult.total}
        </div>
      </header>

      {/* MAIN BODY WITH ADJUSTABLE SIDEBAR */}
      <Split 
        className="main-split" 
        sizes={[20, 80]} 
        minSize={[150, 400]} 
        gutterSize={8}
        style={{ flex: 1, display: 'flex' }}
      >
        {/* SIDEBAR */}
        <aside style={{ background: '#ffffff', padding: '15px', overflowY: 'auto', height: '100%' }}>
          <h3 style={{ color: '#C994FF', fontSize: '0.8rem', marginBottom: '15px', letterSpacing: '1px' }}>TEMPLATES</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* SEARCHING */}
            <div>
              <p style={{ color: '#7F57F9', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '5px' }}>SEARCHING</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('search/linear_search')}>Linear Search</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('search/binary_search')}>Binary Search</button>
              </div>
            </div>

            {/* SORTING */}
            <div>
              <p style={{ color: '#7F57F9', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '5px' }}>SORTING</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/bubble_sort')}>Bubble Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/merge_sort')}>Merge Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/insertion_sort')}>Insertion Sort</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('sort/selection_sort')}>Selection Sort</button>
              </div>
            </div>

            {/* RECURSIVE */}
            <div>
              <p style={{ color: '#7F57F9', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '5px' }}>RECURSIVE</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_factorial')}>Factorial</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_fibonacci')}>Fibonacci</button>
                <button className="template-btn" onClick={() => loadAlgorithmTemplate('recursive/recursive_permutation')}>Permutation</button>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
            <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
          </div>
          <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#0d0d0d', padding: '20px', overflow: 'auto' }}>
            <pre style={{ color: '#F5F5F5', fontSize: '0.9rem', lineHeight: '1.5' }}>{generatedPython}</pre>
          </div>

          {/* HOVERING CONSOLE / COMPLEXITY PANEL */}
          {bottomPanel && (
            <div className="hover-panel" style={{
              position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
              width: '800px', background: 'rgba(31, 20, 67, 0.95)', border: '1px solid #7F57F9',
              borderRadius: '12px', zIndex: 1000, color: 'white', backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: '#4830A0', borderRadius: '11px 11px 0 0' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px' }}>{bottomPanel === 'console' ? '💻 CONSOLE' : '📊 COMPLEXITY ANALYSIS'}</span>
                <button onClick={() => setBottomPanel(null)} style={{ background: 'none', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '15px' }}>
                {bottomPanel === 'console' ? (
                  <pre style={{ margin: 0, color: '#00ff00', fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{consoleOutput}</pre>
                ) : (
                  <div className="complexity-content">
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <button onClick={() => setActiveTab("time_asymptotic")} style={{ padding: '4px 10px', background: activeTab === 'time_asymptotic' ? '#7F57F9' : '#34495e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Asymptotic Analysis</button>
                      
                      {/* ONLY rendered when is_recursive boolean is flagged true by python index.py */}
                      {analysisResult.is_recursive && (
                        <button onClick={() => setActiveTab("time_recurrence")} style={{ padding: '4px 10px', background: activeTab === 'time_recurrence' ? '#7F57F9' : '#34495e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Recurrence Relation</button>
                      )}

                      <button onClick={() => setActiveTab("space")} style={{ padding: '4px 10px', background: activeTab === 'space' ? '#7F57F9' : '#34495e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Space</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #4830A0' }}>
                          <th style={{ paddingBottom: '5px', color: '#7F57F9' }}>Line of Code</th>
                          <th style={{ paddingBottom: '5px', color: '#7F57F9', textAlign: 'right' }}>Complexity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Tab Switcher Handler Map Array */}
                        {(activeTab === 'time_asymptotic' ? analysisResult.lines : 
                          activeTab === 'time_recurrence' ? analysisResult.recurrence_lines : 
                          analysisResult.space_lines).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(127, 87, 249, 0.2)' }}>
                          {/* Left Column: Code Snippet with pedagogical indentation */}
                          <td style={{ 
                            color: row.color || 'white', 
                            padding: '8px 0', 
                            paddingLeft: `${(row.indent || 0) * 15}px`, 
                            fontFamily: 'monospace',
                            fontSize: '0.9rem'
                          }}>
                            {row.lineOfCode}
                          </td>
                          
                          {/* Right Column: Complexity notation using the SAME color */}
                          <td style={{ 
                            color: row.color || 'white',
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            paddingLeft: '20px'
                          }}>
                            {row.complexity}
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLOATING BOTTOM CONTROLS */}
          <footer style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '20px', background: 'rgba(26, 26, 26, 0.95)', padding: '10px 30px',
            borderRadius: '50px', border: '2px solid #4830A0', zIndex: 1001, boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <button 
              onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')} 
              style={{ background: 'none', border: 'none', color: bottomPanel === 'console' ? '#E058FB' : 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
            >
              ⌨️ Console
            </button>
            <div style={{ width: '1px', background: '#4830A0', height: '20px' }}></div>
            <button 
              onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')} 
              style={{ background: 'none', border: 'none', color: bottomPanel === 'complexity' ? '#E058FB' : 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
            >
              📊 Complexity
            </button>
          </footer>
        </main>
      </Split>

      <style>{`
        .main-split { display: flex; width: 100%; }
        .gutter { background-color: #4830A0; background-repeat: no-repeat; background-position: 50%; cursor: col-resize; transition: 0.2s; }
        .gutter:hover { background-color: #7F57F9; }
        .template-btn { background: #34495e; color: #F5F5F5; border: none; padding: 10px; text-align: left; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
        .template-btn:hover { background: #7F57F9; transform: translateX(5px); }
        .hover-panel::-webkit-scrollbar { width: 6px; }
        .hover-panel::-webkit-scrollbar-thumb { background: #7d71aa; border-radius: 10px; }
      `}</style>
    </div>
  );
}