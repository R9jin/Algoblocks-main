import { useRef, useState } from "react";
import Split from "react-split";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";

export default function MainApp() {
  const [analysisResult, setAnalysisResult] = useState({ 
      lines: [], 
      total: "O(1)",
      space_lines: [],
      space_total: "O(1)"
  });
  const [activeTab, setActiveTab] = useState("time");
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  
  const [viewMode, setViewMode] = useState("workspace"); 
  const [bottomPanel, setBottomPanel] = useState(null); // Controls which panel is visible

  const workspaceRef = useRef(null);

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
            lines: data.lines,
            space_total: data.space_total || "O(1)",
            space_lines: data.space_lines || []
        });
      }
    } catch (error) {
      console.error("Analysis Error:", error);
    }
  };

  const loadAlgorithmTemplate = async (path) => {
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

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console"); // Auto-open console when running
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedPython }),
      });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch (error) {
      setConsoleOutput("> Connection Error");
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '60px', borderBottom: '1px solid #4830A0' }}>
        <h1 style={{ fontSize: '1.2rem', color: '#E058FB', margin: 0 }}>ALGOBLOCKS</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setViewMode("workspace")} style={{ padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: viewMode === 'workspace' ? '#7F57F9' : '#34495e', color: 'white' }}>📂 Workspace</button>
          <button onClick={() => setViewMode("python")} style={{ padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: viewMode === 'python' ? '#7F57F9' : '#34495e', color: 'white' }}>🐍 Python Code</button>
          <button onClick={runCode} style={{ padding: '8px 25px', borderRadius: '5px', cursor: 'pointer', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold' }}>▶ RUN</button>
        </div>
        <div className="complexity-badge" style={{ color: '#00ff00', fontWeight: 'bold' }}>Total: {analysisResult.total}</div>
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
        <aside style={{ background: '#1a1a2e', padding: '15px', overflowY: 'auto', height: '100%' }}>
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
              width: '500px', background: 'rgba(31, 20, 67, 0.95)', border: '1px solid #7F57F9',
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
                      <button onClick={() => setActiveTab("time")} style={{ padding: '4px 10px', background: activeTab === 'time' ? '#7F57F9' : '#34495e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Time</button>
                      <button onClick={() => setActiveTab("space")} style={{ padding: '4px 10px', background: activeTab === 'space' ? '#7F57F9' : '#34495e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Space</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #4830A0' }}>
                          <th style={{ paddingBottom: '5px' }}>Line of Code</th>
                          <th style={{ paddingBottom: '5px' }}>Complexity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeTab === 'time' ? analysisResult.lines : analysisResult.space_lines).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(127, 87, 249, 0.2)' }}>
                            <td style={{ color: row.color || 'white', padding: '5px 0', paddingLeft: `${row.indent * 15}px`, fontFamily: 'monospace' }}>{row.lineOfCode}</td>
                            <td style={{ color: '#E058FB', textAlign: 'right' }}>{row.complexity}</td>
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
        .hover-panel::-webkit-scrollbar-thumb { background: #4830A0; border-radius: 10px; }
      `}</style>
    </div>
  );
}