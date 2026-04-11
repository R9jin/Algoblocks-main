import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Split from "react-split";
import BigOModal from "../components/BigOModal.jsx";
import BlocklyWorkspace from "../components/BlocklyWorkspace.jsx";
import ComplexityGraph from '../components/ComplexityGraph.jsx';
import ConfirmModal from "../components/ConfirmModal.jsx";
import WorkspaceHeader from "../components/WorkspaceHeader.jsx";
import "../styles/MainApp.css";
import { formatComplexity } from "../utils/formatters";

<<<<<<< HEAD
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/prism';

import Editor from "@monaco-editor/react";

=======
// --- Base System Templates (Hardcoded paths for local JSON files) ---
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
const SIDEBAR_TEMPLATES = [
  { name: "Linear Search", path: "search/linear_search", desc: "Sequentially checks each element until the target is found or the list is exhausted." },
  { name: "Binary Search", path: "search/binary_search", desc: "Finds the position of a target value within a sorted array by repeatedly dividing the search interval in half." },
  { name: "Exponential Search", path: "search/exponential_search", desc: "Finds the range where the target may exist by repeated doubling, then performs binary search within that range." },
  { name: "Bubble Sort", path: "sort/bubble_sort", desc: "Repeatedly swaps adjacent elements if they are in the wrong order." },
  { name: "Selection Sort", path: "sort/selection_sort", desc: "Finds the minimum element from the unsorted part and places it at the beginning." },
  { name: "Insertion Sort", path: "sort/insertion_sort", desc: "Builds the final sorted array one element at a time by inserting elements into their correct position." },
  { name: "Merge Sort", path: "sort/merge_sort", desc: "Divides the array into halves, sorts them, and merges them back." },
  { name: "Quick Sort", path: "sort/quick_sort", desc: "Partitions elements around a pivot, then recursively sorts the subarrays." },
  { name: "Factorial (Recursive)", path: "recursive/recursive_factorial", desc: "Calculates the factorial of a number using recursion." },
  { name: "Fibonacci (Recursive)", path: "recursive/recursive_fibonacci", desc: "Generates the Fibonacci sequence using recursive calls." },
  { name: "Permutation (Recursive)", path: "recursive/recursive_permutation", desc: "Generates all permutations of a string using backtracking." },
  { name: "Tower of Hanoi (Recursive)", path: "recursive/recursive_tower_of_hanoi", desc: "Moves disks between rods following the Tower of Hanoi rules using recursion." },
];

export default function MainApp() {
  const location = useLocation();
  const workspaceRef = useRef(null);

<<<<<<< HEAD
  // Mode Selection State - Default to null to trigger the prompt, unless navigated with a specific mode
  const [codingMode, setCodingMode] = useState(location.state?.initialCodingMode || null);

  // Keep track of templates or projects that need to be loaded AFTER a mode is selected
  const [pendingLoad, setPendingLoad] = useState({
    templatePath: location.state?.templatePath || null,
    projectToLoad: location.state?.projectToLoad || null,
  });

  const [manualPythonCode, setManualPythonCode] = useState("# Write your Python code here\n");

  const [analysisResult, setAnalysisResult] = useState({
    lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false
  });

=======
  // --- UI & Analysis States ---
  const [analysisResult, setAnalysisResult] = useState({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);
  const [viewMode, setViewMode] = useState("workspace");
  const [bottomPanel, setBottomPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // --- Error State ---
  const [syntaxError, setSyntaxError] = useState(null);

  // --- Unified Template List State ---
  const [allTemplates, setAllTemplates] = useState([]);
  const [currentLoadedId, setCurrentLoadedId] = useState(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("Untitled Project");

<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState("local");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: "", message: "", confirmText: "Confirm", isDanger: false, onConfirmAction: null
  });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
=======
  // --- Modals & Notifications ---
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [saveModal, setSaveModal] = useState({ isOpen: false, title: "", description: "" });
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", confirmText: "Confirm", isDanger: false, onConfirmAction: null });
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
  const [isBigOModalOpen, setIsBigOModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const [expandedLines, setExpandedLines] = useState({});
<<<<<<< HEAD

=======
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
  const toggleLine = (index) => setExpandedLines(prev => ({ ...prev, [index]: !prev[index] }));

  const [panelHeight, setPanelHeight] = useState(450);
  const isDragging = useRef(false);
<<<<<<< HEAD
  const analysisTimeoutRef = useRef(null);
  const workspaceRef = useRef(null);
=======
  const [isEditingCode, setIsEditingCode] = useState(false);
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  // --- Resizing Bottom Panel Logic ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY - 48;
      if (newHeight >= 150 && newHeight <= window.innerHeight - 150) setPanelHeight(newHeight);
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
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  const handleDragStart = (e) => { e.preventDefault(); isDragging.current = true; document.body.style.cursor = "ns-resize"; document.body.style.userSelect = "none"; };

<<<<<<< HEAD
  const performAnalysis = async (codeStr) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeStr })
      });
      const data = await response.json();
      if (data.status === "success") {
        setAnalysisResult({
          total: data.total, space_total: data.space_total || "O(1)",
          lines: data.lines || [], is_recursive: data.is_recursive || false
        });
      } else {
        setAnalysisResult({
          total: "Error", space_total: "Error",
          lines: [{ lineOfCode: "Analysis Failed", operation: "-", local_time: "Error", global_time: "Error", local_space: "Error", global_space: "Error", local_explanation: data.message || "Error", global_explanation: "Error" }],
          is_recursive: false
        });
=======
  // --- Fetch Combined Templates: System First, then User's Custom Templates ---
  const fetchTemplates = async () => {
    try {
      const baseTemplates = SIDEBAR_TEMPLATES.map(t => ({ ...t, title: t.name, description: t.desc, isSystem: true }));
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setAllTemplates(baseTemplates);
        return;
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
      }

      const user = JSON.parse(storedUser);
      const res = await fetch('/api/projects');
      const data = await res.json();

      if (data.status === 'success') {
        const userTemplates = data.projects
          .filter(p => p.owner_id === user.email)
          .map(p => ({
            _id: p._id, title: p.title, description: p.description || "Custom saved template", isSystem: false, data: p.data
          }));
        setAllTemplates([...baseTemplates, ...userTemplates]);
      } else {
        setAllTemplates(baseTemplates);
      }
    } catch (e) {
      console.error("Failed to load templates", e);
      // Fallback: If DB fails, at least show the system templates
      setAllTemplates(SIDEBAR_TEMPLATES.map(t => ({ ...t, title: t.name, description: t.desc, isSystem: true })));
    }
  };

<<<<<<< HEAD
  const handleBlocklyChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    setBlocklyJson(json);
    performAnalysis(pythonCode);
  };

  const handleManualCodeChange = (value) => {
    setManualPythonCode(value);
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = setTimeout(() => performAnalysis(value), 1000);
  };

  // Add this near your other state declarations
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    placeholder: "",
    confirmText: "Submit",
    onConfirm: null,
  });
  const [promptValue, setPromptValue] = useState("");

  const executeLoadTemplate = async (path) => {
    if (codingMode === 'manual') {
      alert("Templates are currently designed for Block-based mode. Switching to manual will clear the visual template.");
      return;
    }

    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      const response = await fetch(`/templates/${path}.json`);
      if (!response.ok) throw new Error("Template not found");
      const json = await response.json();

      if (codingMode === 'blocks' && workspaceRef.current) {
=======
  useEffect(() => { fetchTemplates(); }, []);

  const executeLoad = async (item) => {
    try {
      setAnalysisResult({ lines: [], total: "Analyzing...", space_total: "Analyzing...", is_recursive: false });
      let json;
      if (item.isSystem) {
        const response = await fetch(`/templates/${item.path}.json`);
        if (!response.ok) throw new Error("Template not found");
        json = await response.json();
        setCurrentLoadedId(null);
      } else {
        json = item.data;
        setCurrentLoadedId(item._id);
      }

      setCurrentProjectTitle(item.title);
      if (workspaceRef.current) {
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
        workspaceRef.current.loadTemplate(json);
        setViewMode("workspace");
      }
    } catch (error) {
      showToast("Failed to load template", "error");
    }
  };

<<<<<<< HEAD
  const loadAlgorithmTemplate = (path, skipConfirm = false) => {
    if (codingMode === 'manual') {
      alert("Templates are currently designed for Block-based mode.");
      return;
    }
    if (!skipConfirm) {
      setModalConfig({
        isOpen: true, title: "Load Pre-made Template?", message: "Loading this algorithm will overwrite your current workspace. Do you want to continue?", confirmText: "Load Template", isDanger: false,
        onConfirmAction: () => { closeModal(); executeLoadTemplate(path); }
      });
    } else {
      executeLoadTemplate(path);
    }
  };

  // Centralized Hook: Wait until `codingMode` is chosen, then load pending projects/templates
  useEffect(() => {
    if (codingMode !== null && (pendingLoad.templatePath || pendingLoad.projectToLoad)) {
      // Delay execution slightly so Monaco or Blockly has time to mount in the DOM
      setTimeout(() => {
        if (pendingLoad.templatePath) {
          loadAlgorithmTemplate(pendingLoad.templatePath, true);
        }
        if (pendingLoad.projectToLoad) {
          if (codingMode === 'blocks' && workspaceRef.current) {
            workspaceRef.current.loadTemplate(pendingLoad.projectToLoad.data);
            setCurrentProjectId(pendingLoad.projectToLoad._id);
            setCurrentProjectTitle(pendingLoad.projectToLoad.title);
            setViewMode("workspace");
          } else if (codingMode === 'manual') {
            alert("This project was saved in Block mode and cannot be loaded directly into the Manual Python IDE yet.");
          }
        }

        // Clear pending actions and browser history state so it doesn't loop
        setPendingLoad({ templatePath: null, projectToLoad: null });
        window.history.replaceState({}, document.title);
      }, 500);
    }
  }, [codingMode, pendingLoad]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (codingMode === 'blocks' && !blocklyJson) {
          alert("The workspace is empty. Nothing to save!");
          return;
        }
        if (currentProjectId) handleUpdateDB();
        else handleSaveToDB();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectId, blocklyJson, codingMode]);

  const handleClear = () => {
    setModalConfig({
      isOpen: true, title: "Clear Workspace?", message: "Are you sure you want to clear the workspace? All unsaved progress will be lost.", confirmText: "Clear Workspace", isDanger: true,
=======
  const loadConfirm = (item) => {
    setModalConfig({
      isOpen: true, title: `Load ${item.title}?`, message: "This will overwrite your current workspace. Continue?", confirmText: "Load Template", isDanger: false,
      onConfirmAction: () => { closeModal(); executeLoad(item); }
    });
  };

  // --- Blockly View Changes ---
  const handleBlocklyChange = async (json, pythonCode) => {
    if (!isEditingCode) setGeneratedPython(pythonCode);
    setBlocklyJson(json);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pythonCode }) });
      const data = await response.json();

      if (data.status === "success") {
        setAnalysisResult({ total: data.total, space_total: data.space_total || "O(1)", lines: data.lines || [], is_recursive: data.is_recursive || false });
        setSyntaxError(null);
      } else if (data.status === "error" && data.error_type === "SyntaxError") {
        setSyntaxError({ line: data.line, message: data.message });
        setAnalysisResult({ lines: [], total: "Syntax Error", space_total: "-", is_recursive: false });
      } else {
        setSyntaxError(null);
      }
    } catch (e) { console.error("Analysis Error:", e); }
  };

  // --- Real-time Python Code Analysis (Debounced) ---
  useEffect(() => {
    if (!isEditingCode) return;
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: generatedPython }) });
        const data = await response.json();
        if (data.status === "success") {
          setAnalysisResult({ total: data.total, space_total: data.space_total || "O(1)", lines: data.lines || [], is_recursive: data.is_recursive || false });
          setSyntaxError(null);
        } else if (data.status === "error" && data.error_type === "SyntaxError") {
          setSyntaxError({ line: data.line, message: data.message });
          setAnalysisResult({ lines: [], total: "Syntax Error", space_total: "-", is_recursive: false });
        } else {
          setSyntaxError(null);
        }
      } catch (error) { console.error("Analysis Error:", error); }
    }, 500); // 500ms delay to feel exactly like VSCode live syntax checking
    return () => clearTimeout(timeoutId);
  }, [generatedPython, isEditingCode]);

  const handleSyncToBlocks = async () => {
    if (workspaceRef.current && generatedPython) {
      try {
        await workspaceRef.current.loadFromPython(generatedPython);
        setIsEditingCode(false);
        setViewMode("workspace");
        showToast("Code successfully synced to Blocks");
      } catch (e) {
        // FIX: Use the actual error message from the exception
        showToast(`Cannot Sync: ${e.message}`, "error");
      }
    }
  };

  const handleClear = () => {
    setModalConfig({
      isOpen: true, title: "Clear Workspace?", message: "Are you sure you want to clear? All unsaved progress will be lost.", confirmText: "Clear", isDanger: true,
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
      onConfirmAction: () => {
        closeModal();
        if (codingMode === 'blocks' && workspaceRef.current) {
          workspaceRef.current.clear();
          setGeneratedPython("# Drag blocks to generate Python code");
          setBlocklyJson(null);
<<<<<<< HEAD
        } else if (codingMode === 'manual') {
          setManualPythonCode("# Write your Python code here\n");
=======
          setAnalysisResult({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
          setBottomPanel(null); setExpandedLines({}); setSyntaxError(null);
          setCurrentLoadedId(null); setCurrentProjectTitle("Untitled Project");
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
        }
        setAnalysisResult({ lines: [], total: "O(1)", space_total: "O(1)", is_recursive: false });
        setBottomPanel(null);
        setExpandedLines({});
        setCurrentProjectId(null);
        setCurrentProjectTitle("Untitled Project");
      }
    });
  };

<<<<<<< HEAD
  const handleExport = () => {
    if (codingMode === 'blocks' && !blocklyJson) {
      alert("The workspace is empty. Nothing to export!");
      return;
    }

    // Open our custom prompt modal
    setPromptValue("my_algorithm");
    setPromptConfig({
      isOpen: true,
      title: "Export Project",
      message: "Enter a name for your export file:",
      placeholder: "e.g., my_algorithm",
      confirmText: "Export",
      onConfirm: (projectName) => {
        setPromptConfig({ ...promptConfig, isOpen: false }); // Close modal

        const finalName = projectName.trim() || "my_algorithm";

        if (codingMode === 'manual') {
          if (manualPythonCode) {
            const blob = new Blob([manualPythonCode], { type: "text/x-python" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url; link.download = `${finalName.replace(/\s+/g, '_')}.py`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } else {
          const blob = new Blob([JSON.stringify(blocklyJson, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url; link.download = `${finalName.replace(/\s+/g, '_')}.json`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    });
  };

  const handleSaveToDB = async () => {
    if (codingMode === 'blocks' && !blocklyJson) {
      alert("The workspace is empty. Nothing to save!");
      return;
    }
    if (codingMode === 'manual' && (!manualPythonCode || manualPythonCode.trim() === '')) {
      alert("Code editor is empty. Nothing to save!");
      return;
    }

    // Open our custom prompt modal
    setPromptValue(currentProjectTitle !== "Untitled Project" ? currentProjectTitle : "");
    setPromptConfig({
      isOpen: true,
      title: "Save Project",
      message: "Enter a title for your project:",
      placeholder: "e.g., My Awesome Algorithm",
      confirmText: "Save to Cloud",
      onConfirm: async (projectTitle) => {
        setPromptConfig({ ...promptConfig, isOpen: false }); // Close modal

        const finalTitle = projectTitle.trim() || "Untitled Project";
        const projectData = codingMode === 'blocks'
          ? blocklyJson
          : { type: 'manual', code: manualPythonCode };

        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: finalTitle,
              data: projectData
            })
          });

          const result = await response.json();

          if (result.status === 'success') {
            setCurrentProjectId(result.id);
            setCurrentProjectTitle(finalTitle);
          } else {
            alert("Failed to save project.");
          }
        } catch (error) {
          console.error("Save error:", error);
          alert("Error saving project to database. Check connection.");
        }
      }
    });
  };

  const handleUpdateDB = async () => {
    if (!currentProjectId) {
      alert("No project ID found. Save as a new project first.");
      return;
    }

    const projectData = codingMode === 'blocks'
      ? blocklyJson
      : { type: 'manual', code: manualPythonCode };

    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: projectData
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert("Changes saved successfully!");
      } else {
        alert("Failed to update project.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Error updating project in database.");
    }
  };

  const runCode = async () => {
    setConsoleOutput("> Running...");
    setBottomPanel("console");
    setExpandedLines({});
    const codeToRun = codingMode === "manual" ? manualPythonCode : generatedPython;
    try {
      const response = await fetch("/api/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToRun }),
      });
      const data = await response.json();
      setConsoleOutput(data.status === "success" ? data.output : "> Error: " + data.output);
    } catch {
      setConsoleOutput("> Connection Error");
=======
  const openSaveModal = () => {
    if (!blocklyJson) { showToast("The workspace is empty. Nothing to save!", "error"); return; }
    setSaveModal({ isOpen: true, title: currentProjectTitle !== "Untitled Project" ? currentProjectTitle : "", description: "" });
  };

  const submitSave = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { showToast("You must be signed in to save.", "error"); return; }

    const user = JSON.parse(storedUser);
    const payload = { title: saveModal.title || "My Custom Template", description: saveModal.description || "", data: blocklyJson, owner_id: user.email };

    try {
      let res;
      if (currentLoadedId) {
        res = await fetch(`/api/projects/${currentLoadedId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }

      if (res.ok) {
        const result = await res.json();
        showToast("Template saved!", "success");
        if (!currentLoadedId && result.id) setCurrentLoadedId(result.id);
        setCurrentProjectTitle(payload.title);
        fetchTemplates();
      } else {
        showToast("Failed to save", "error");
      }
    } catch (e) { showToast("Error saving.", "error"); }
    setSaveModal({ ...saveModal, isOpen: false });
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Template deleted!", "success");
        fetchTemplates();
        if (currentLoadedId === id) handleClear();
      } else { showToast("Failed to delete", "error"); }
    } catch (e) { showToast("Connection error", "error"); }
  };

  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const socketRef = useRef(null);

  const runCode = () => {
    setConsoleOutput("> Initializing session...\n");
    setBottomPanel("console");

    // Use window.location.host to automatically handle localhost:5173
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/ws/run`);

    socketRef.current = socket;

    setIsWaitingForInput(false);

    socket.onopen = () => {
      console.log("✅ Connected");
      socket.send(JSON.stringify({ type: "run", code: generatedPython }));
      setConsoleOutput("");
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "output") {
        setConsoleOutput((prev) => prev + msg.data);
      } else if (msg.type === "input_request") {
        setConsoleOutput((prev) => prev + msg.prompt);
        setIsWaitingForInput(true);
      } else if (msg.type === "error") {
        setConsoleOutput((prev) => prev + "\nRuntime Error: " + msg.data);
      } else if (msg.type === "done") {
        setConsoleOutput((prev) => prev + "\n> Program finished.");
        setIsWaitingForInput(false);
        socket.close();
      }
    };

    socket.onerror = (e) => {
      console.error("❌ WebSocket error:", e);
      setConsoleOutput("❌ Failed to connect to backend.");
    };

    socket.onclose = () => {
      console.log("⚠️ Socket closed");
    };
  };

  const handleSendInput = (e) => {
    if (e.key === "Enter" && isWaitingForInput && socketRef.current) {
      setConsoleOutput((prev) => prev + userInput + "\n");

      socketRef.current.send(
        JSON.stringify({ type: "input_response", data: userInput })
      );

      setUserInput("");
      setIsWaitingForInput(false);
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
    }
  };

  const filteredTemplates = allTemplates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  /* Inside your MainApp component */

  const consoleEndRef = useRef(null);

  // Auto-scroll logic: whenever consoleOutput or isWaitingForInput changes
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput, isWaitingForInput]);


  return (
    <div className="workspace-app-container">
<<<<<<< HEAD
      {/* INITIAL DIALOG: Automatically overlays when user navigates directly to /app */}
      {codingMode === null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#1C1236', padding: '40px', borderRadius: '12px',
            textAlign: 'center', border: '1px solid #6C5CE7', maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: '#EBE4FF', marginBottom: '15px' }}>Choose Workspace Mode</h2>
            <p style={{ color: '#A096B9', marginBottom: '30px', lineHeight: '1.5' }}>
              Select how you want to build your algorithm. You can use our visual block builder or jump straight into writing Python code.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={() => setCodingMode('blocks')} style={{
                padding: '12px 24px', background: '#6C5CE7', color: 'white', fontWeight: 'bold',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <img src="/assets/blocks-icon.png" alt="Blocks" style={{ width: '20px', filter: 'brightness(0) invert(1)' }} />
                Block Workspace
              </button>
              <button onClick={() => setCodingMode('manual')} style={{
                padding: '12px 24px', background: 'transparent', color: '#6C5CE7', fontWeight: 'bold',
                border: '2px solid #6C5CE7', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <img src="/assets/python-icon.png" alt="Python" style={{ width: '20px' }} />
                Manual Coding
              </button>
=======
      {toast.show && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      {saveModal.isOpen && (
        <div className="modal-overlay">
          <div className="save-modal-content">
            <h2 className="save-modal-title">Save Custom Template</h2>
            <div className="save-modal-form">
              <div>
                <label className="save-modal-label">Template Name</label>
                <input type="text" value={saveModal.title} onChange={e => setSaveModal({ ...saveModal, title: e.target.value })} placeholder="e.g. My Optimized Sort" className="save-modal-input" />
              </div>
              <div>
                <label className="save-modal-label">Description</label>
                <textarea value={saveModal.description} onChange={e => setSaveModal({ ...saveModal, description: e.target.value })} placeholder="What does this do?" className="save-modal-textarea" />
              </div>
            </div>
            <div className="save-modal-actions">
              <button onClick={() => setSaveModal({ ...saveModal, isOpen: false })} className="save-modal-cancel-btn">Cancel</button>
              <button onClick={submitSave} className="save-modal-confirm-btn">Save</button>
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      <WorkspaceHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        runCode={runCode}
        handleExport={handleExport}
        handleSaveToDB={handleSaveToDB}
        currentProjectId={currentProjectId}
        currentProjectTitle={currentProjectTitle}
        handleUpdateDB={handleUpdateDB}
        codingMode={codingMode}
      />

      <Split
        className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}
        sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}
      >
        <aside className="templates-sidebar">
          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search Templates" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
=======
      <WorkspaceHeader viewMode={viewMode} setViewMode={setViewMode} runCode={runCode} handleExport={openSaveModal} handleSaveToDB={openSaveModal} currentProjectId={currentLoadedId} currentProjectTitle={currentProjectTitle} handleUpdateDB={submitSave} />

      <Split className={`workspace-split ${!isSidebarVisible ? 'sidebar-hidden' : ''}`} sizes={[20, 80]} minSize={[250, 400]} gutterSize={8}>

        <aside className="templates-sidebar">
          <div className="sidebar-search">
            <img src="/assets/search-icon.png" alt="Search" className="search-icon" />
            <input type="text" placeholder="Search templates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
          </div>
          <div className="sidebar-list">
            {filteredTemplates.map((item) => (
              <div key={item._id || item.title} className="sidebar-card" onClick={() => loadConfirm(item)}>
                <div className="sidebar-card-header">
                  <h4>{item.title}</h4>
                  {item.isSystem ? (<span className="badge-system">System</span>) : (
                    <div className="badge-custom-group">
                      <span className="badge-custom">Custom</span>
                      <button onClick={(e) => handleDeleteItem(e, item._id)} className="sidebar-delete-btn" title="Delete">✕</button>
                    </div>
                  )}
                </div>
                <p>{item.description}</p>
              </div>
            ))}
            {filteredTemplates.length === 0 && <p className="no-results">No templates found.</p>}
          </div>
        </aside>

        <main className="workspace-main">
          <button className={`sidebar-toggle-btn ${!isSidebarVisible ? 'closed' : ''}`} onClick={() => setIsSidebarVisible(!isSidebarVisible)} title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}>
            <span className="toggle-icon">❮</span>
          </button>

          <div className="editor-container">
<<<<<<< HEAD
            {codingMode === 'blocks' ? (
              <>
                <div style={{ display: viewMode === 'workspace' ? 'block' : 'none', height: '100%' }}>
                  <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
                </div>
                <div style={{ display: viewMode === 'python' ? 'block' : 'none', height: '100%', background: '#1C1236', overflow: 'auto' }}>
                  <SyntaxHighlighter language="python" style={shadesOfPurple} showLineNumbers={true}
                    customStyle={{ margin: 0, padding: '20px', fontSize: '0.95rem', fontFamily: "'Fira Code', Consolas, Monaco, monospace", background: '#1C1236', color: '#EBE4FF', minHeight: '100%' }}>
                    {generatedPython}
                  </SyntaxHighlighter>
                </div>
              </>
            ) : codingMode === 'manual' ? (
              <div style={{ height: '100%', width: '100%' }}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="shadesOfPurpleCustom"
                  value={manualPythonCode}
                  onChange={handleManualCodeChange}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme('shadesOfPurpleCustom', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: 'B362FF', fontStyle: 'italic' },
                        { token: 'keyword', foreground: 'FF9D00' },
                        { token: 'string', foreground: 'A5FF90' },
                        { token: 'number', foreground: 'FF628C' },
                        { token: 'operator', foreground: 'FF9D00' },
                        { token: 'function', foreground: '9EFFFF' },
                        { token: 'type', foreground: '9EFFFF' },
                        { token: 'variable', foreground: 'FFFFFF' },
                      ],
                      colors: {
                        'editor.background': '#1C1236', // Matches your MainApp/ActivityApp container
                        'editor.foreground': '#FFFFFF',
                        'editorLineNumber.foreground': '#A599E9',
                        'editorCursor.foreground': '#FAD000',
                        'editor.selectionBackground': '#B362FF44',
                        'editor.lineHighlightBackground': '#2D2B55',
                        'editorIndentGuide.background': '#A599E944',
                        'editorWhitespace.foreground': '#A599E922',
                      }
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                    padding: { top: 20 },
                    wordWrap: "on",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true
                  }}
                />
              </div>
            ) : (
              /* Empty state while the prompt is active */
              <div style={{ height: '100%', background: '#1C1236' }}></div>
            )}
=======
            {/* Visual Workspace view */}
            <div className={viewMode === 'workspace' ? 'workspace-view d-block' : 'workspace-view d-none'}>
              <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} syntaxError={syntaxError} />
            </div>

            {/* VSCode-like Python Editor View */}
            <div className={viewMode === 'python' ? 'python-view d-flex' : 'python-view d-none'}>
              <div className="python-header">
                <span className="python-sync-status">{isEditingCode ? "✏️ Unsaved code changes..." : "Code is synced with blocks."}</span>
                <button onClick={handleSyncToBlocks} disabled={!isEditingCode} className={`python-sync-btn ${isEditingCode ? 'active' : 'disabled'}`}>
                  Sync to Blocks ↻
                </button>
              </div>

              <div style={{ position: 'relative', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

                {/* VSCode-style Dynamic Line Error Highlight */}
                {syntaxError && (
                  <div style={{
                    position: 'absolute',
                    top: `${(syntaxError.line - 1) * 24 + 20}px`, /* 20px padding + (lineIdx * 24px lineHeight) */
                    left: 0,
                    right: 0,
                    height: '24px',
                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                    borderLeft: '4px solid #E74C3C',
                    pointerEvents: 'none',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '16px'
                  }}>
                    <span style={{ color: '#E74C3C', position: 'absolute', right: '20px', fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 'bold' }}>
                      ⚠️ {syntaxError.message}
                    </span>
                  </div>
                )}

                <textarea
                  value={generatedPython}
                  onChange={(e) => {
                    setGeneratedPython(e.target.value);
                    setIsEditingCode(true);
                    if (syntaxError) setSyntaxError(null); // Temporarily hide error while user fixes it
                  }}
                  spellCheck={false}
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: '100%',
                    margin: 0,
                    padding: '20px',
                    fontSize: '15px', // Fixed sizing to guarantee 1-to-1 sync with error highlight
                    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                    background: 'transparent',
                    color: '#EBE4FF',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    whiteSpace: 'pre',
                    lineHeight: '24px', // Fixed mapping
                    zIndex: 2,
                    position: 'relative'
                  }}
                />
              </div>
            </div>
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
          </div>

          {/* Bottom Panel (Console & Complexity) */}
          {bottomPanel && (
            <div className="bottom-hover-panel" style={{ height: `${panelHeight}px` }}>
              <div className="panel-resizer" onMouseDown={handleDragStart}><div className="resizer-dash"></div></div>
              <div className="panel-header">
                <span className="panel-title">{bottomPanel === 'console' ? 'Console Output' : 'Complexity Analysis'}</span>
                <button onClick={() => setBottomPanel(null)} className="panel-close-btn">✕</button>
              </div>
              <div className="panel-body">
                {bottomPanel === 'console' ? (
                  <div className="console-container">
                    <pre className="console-output">{consoleOutput}</pre>

                    {isWaitingForInput && (
                      <div className="console-input-line">
                        <span className="console-cursor">❯</span>
                        <input
                          autoFocus
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={handleSendInput}
                          className="console-input-field"
                          placeholder="Type here and press Enter..."
                        />
                      </div>
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                ) : (
                  <div className="complexity-content">
<<<<<<< HEAD
                    <div className="complexity-tabs" style={{ justifyContent: 'space-between', padding: '0 15px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setActiveTab("local"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}>Local Complexity</button>
                        <button onClick={() => { setActiveTab("global"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}>Global Complexity</button>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span className="total-badge"><span className="total-label">Total Time:</span> {analysisResult.total}</span>
                        <span className="total-badge" style={{ backgroundColor: 'rgba(0, 184, 163, 0.15)', color: '#00b8a3', border: '1px solid rgba(0, 184, 163, 0.3)' }}><span className="total-label" style={{ color: '#00b8a3' }}>Total Space:</span> {analysisResult.space_total}</span>
                      </div>
                    </div>

                    <div className="complexity-table-wrapper" style={{ overflowX: 'auto' }}>
                      <table className="complexity-table" style={{ width: '100%', minWidth: '800px', textAlign: 'left' }}>
                        <thead>
                          <tr><th>Line of Code</th><th>Operation</th><th>{activeTab === 'local' ? 'Local Time' : 'Global Time'}</th><th>{activeTab === 'local' ? 'Local Space' : 'Global Space'}</th></tr>
                        </thead>
                        <tbody>
                          {analysisResult.lines.map((row, i) => {
                            const explanationText = activeTab === 'local' ? row.local_explanation : row.global_explanation;
=======
                    <div className="complexity-tabs">
                      <div className="tab-btn-group">
                        <button onClick={() => { setActiveTab("local"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}>Local Complexity</button>
                        <button onClick={() => { setActiveTab("global"); setExpandedLines({}); }} className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}>Global Complexity</button>
                      </div>
                      <div className="total-badge-group">
                        <span className="total-badge">
                          <span className="total-label">Total Time:</span>{" "}
                          <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                            {formatComplexity(analysisResult.total)}
                          </span>
                        </span>
                        <span
                          className="total-badge"
                          style={{
                            backgroundColor: 'rgba(0, 184, 163, 0.15)',
                            color: '#00b8a3',
                            border: '1px solid rgba(0, 184, 163, 0.3)'
                          }}
                        >
                          <span className="total-label" style={{ color: '#00b8a3' }}>
                            Total Space:
                          </span>{" "}
                          <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                            {formatComplexity(analysisResult.space_total)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="complexity-table-wrapper">
                      <table className="complexity-table">
                        <thead><tr><th>Line of Code</th><th>Operation</th><th>{activeTab === 'local' ? 'Local Time' : 'Global Time'}</th><th>{activeTab === 'local' ? 'Local Space' : 'Global Space'}</th></tr></thead>
                        <tbody>
                          {analysisResult.lines.map((row, i) => {
                            const explanationText = activeTab === 'local' ? row.local_explanation : row.global_explanation;
                            const graphComplexity = activeTab === 'local' ? row.local_time : row.global_time;
                            const graphLabel = activeTab === 'local' ? 'Local Complexity' : 'Global Complexity';
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
                            return (
                              <React.Fragment key={i}>
                                <tr className={`complexity-row ${expandedLines[i] ? 'expanded' : ''}`} onClick={() => toggleLine(i)} style={{ cursor: explanationText ? 'pointer' : 'default' }}>
                                  <td className="code-cell" style={{ color: row.color || 'white', paddingLeft: `${((row.indent || 0) * 15) + 20}px` }}>{row.lineOfCode}</td>
<<<<<<< HEAD
                                  <td style={{ color: '#000000' }}>{row.operation || '-'}</td>
                                  <td className="complexity-cell">{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell">
                                    {formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}
                                    {explanationText && <span className="dropdown-chevron" style={{ marginLeft: '10px' }}>{expandedLines[i] ? '▼' : '▶'}</span>}
=======
                                  <td className="operation-cell">{row.operation || '-'}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>{formatComplexity(activeTab === 'local' ? row.local_time : row.global_time)}</td>
                                  <td className="complexity-cell" style={{ fontWeight: activeTab === 'global' ? 'bold' : 'normal' }}>
                                    {formatComplexity(activeTab === 'local' ? row.local_space : row.global_space)}
                                    {explanationText && <span className="dropdown-chevron">{expandedLines[i] ? '▼' : '▶'}</span>}
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
                                  </td>
                                </tr>
                                {expandedLines[i] && explanationText && (
                                  <tr className="explanation-row">
                                    <td colSpan="4">
<<<<<<< HEAD
                                      <div className="explanation-content" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}><img src="/assets/lightbulb-icon.png" alt="Lightbulb" className="tab-icon" /><p>{explanationText}</p></div>
                                        <div style={{ minWidth: '200px' }}><ComplexityGraph complexity={activeTab === 'local' ? row.local_time : row.global_time} color={row.color} label={activeTab === 'local' ? 'Local' : 'Global'} /></div>
=======
                                      <div className="explanation-content">
                                        <div className="explanation-text">
                                          <img src="/assets/lightbulb-icon.png" alt="Lightbulb" className="tab-icon explanation-icon" />
                                          <p>{explanationText}</p>
                                        </div>
                                        <div className="explanation-graph">
                                          <ComplexityGraph complexity={graphComplexity} color={row.color} label={graphLabel} />
                                        </div>
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
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
<<<<<<< HEAD
              <button className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}>
                <img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console
              </button>
              <button className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}>
                <img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity
              </button>
              <button className="footer-tab" onClick={() => setIsBigOModalOpen(true)} style={{ color: '#ffffff', fontWeight: 'bold' }}>
                <img src="/assets/table-icon.png" alt="Reference" className="tab-icon" /> Big O Reference
              </button>
=======
              <button className={`footer-tab ${bottomPanel === 'console' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'console' ? null : 'console')}><img src="/assets/console-icon.png" alt="Console" className="tab-icon" /> Console</button>
              <button className={`footer-tab ${bottomPanel === 'complexity' ? 'active' : ''}`} onClick={() => setBottomPanel(bottomPanel === 'complexity' ? null : 'complexity')}><img src="/assets/complexity-icon.png" alt="Complexity" className="tab-icon" /> Complexity</button>
              <button className="footer-tab big-o-btn" onClick={() => setIsBigOModalOpen(true)}><img src="/assets/table-icon.png" alt="Reference" className="tab-icon" /> Big O Reference</button>
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
            </div>
            <div className="footer-right">
              <button className="footer-action-icon" onClick={handleClear} title="Clear Workspace"><img src="/assets/recursive-icon.png" alt="Refresh" /></button>
            </div>
          </footer>
        </main>
      </Split>

<<<<<<< HEAD
      {/* --- CUSTOM INPUT PROMPT OVERLAY --- */}
      {promptConfig.isOpen && (
        <div className="custom-prompt-overlay">
          <div className="custom-prompt-modal">
            <h3 className="custom-prompt-title">{promptConfig.title}</h3>
            <p className="custom-prompt-message">{promptConfig.message}</p>
            
            <input 
              type="text" 
              className="custom-prompt-input"
              value={promptValue} 
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptConfig.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') promptConfig.onConfirm(promptValue);
                if (e.key === 'Escape') setPromptConfig({ ...promptConfig, isOpen: false });
              }}
            />
            
            <div className="custom-prompt-actions">
              <button 
                className="custom-prompt-btn custom-prompt-btn-cancel"
                onClick={() => setPromptConfig({ ...promptConfig, isOpen: false })}
              >
                Cancel
              </button>
              <button 
                className="custom-prompt-btn custom-prompt-btn-confirm"
                onClick={() => promptConfig.onConfirm(promptValue)}
              >
                {promptConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

=======
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
      <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} isDanger={modalConfig.isDanger} onCancel={closeModal} onConfirm={modalConfig.onConfirmAction} />
      <BigOModal isOpen={isBigOModalOpen} onClose={() => setIsBigOModalOpen(false)} />
    </div>
  );
}