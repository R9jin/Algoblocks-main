import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BlocklyWorkspace from "../components/BlocklyWorkspace";
import "../styles/ActivityApp.css";

import Split from "react-split";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ConfirmModal from "../components/ConfirmModal.jsx"; // IMPORT MODAL

// --- LEETCODE STYLE ACTIVITY TASKS (EXPANDED) ---
const ACTIVITY_TASKS = [
  // --- LESSON 1: INTRO ---
  {
    id: "l1-t1",
    templatePath: "intro/what_is_algo",
    title: "1. Hello World",
    difficulty: "Easy",
    task: `Welcome to AlgoBlocks! Every great programmer starts their journey with a simple tradition: greeting the world. Your very first task is to write a program that prints a specific greeting message to the system console. 

**Example 1:**
Input: None
Output: "Hello World"

**Constraints:**
• You must familiarize yourself with the visual block interface.
• Connect a simple sequence of Output blocks to print exactly "Hello" and "World".
• Pay attention to capitalization and spacing.`
  },
  {
    id: "l1-t2",
    templatePath: "intro/logic_flow",
    title: "2. Logic & Flow",
    difficulty: "Easy",
    task: `In programming, computers make decisions using conditional statements. You are given a boolean variable \`condition\` which can either be \`true\` or \`false\`. 

Your task is to evaluate this condition and output a specific string based on its truth value. If the condition evaluates to \`true\`, your program must output the string "Yes". If the condition evaluates to \`false\`, your program must output the string "No".

**Example 1:**
Input: condition = true
Output: "Yes"

**Example 2:**
Input: condition = false
Output: "No"

**Constraints:**
• You must use an If-Else conditional block to control the flow of execution.
• The output must match the casing exactly.`
  },
  {
    id: "l1-t3",
    templatePath: "intro/big_o",
    title: "3. Big O Notation",
    difficulty: "Easy",
    task: `Big O notation evaluates how the runtime or space requirements of an algorithm grow as the input size increases. It gives us a high-level understanding of an algorithm's efficiency.

An algorithm with **O(1)** complexity takes the same amount of time regardless of the input size (Constant Time). An algorithm with **O(n)** complexity takes time directly proportional to the input size (Linear Time).

Your task is to build a simple algorithm with **O(n)** time complexity. You are given a non-negative integer \`n\`. Construct a loop that outputs the string "Step" exactly \`n\` times.

**Example 1:**
Input: n = 3
Output: 
"Step"
"Step"
"Step"

**Constraints:**
• 0 <= n <= 10
• You must use a Loop block that executes exactly \`n\` times, demonstrating linear growth.`
  },

  // --- LESSON 2: SEARCHING ALGORITHMS ---
  {
    id: "l2-t1",
    templatePath: "activities/linear_search_act",
    title: "4. Linear Search",
    difficulty: "Easy",
    task: `You are given a 0-indexed array of integers \`arr\` and an integer \`target\`. Your objective is to find the exact position of the \`target\` within the array. 

Write an algorithm that checks each element of the array sequentially from the beginning (index 0) to the end. If the \`target\` is found, return its index. If you reach the end of the array and the \`target\` does not exist in \`arr\`, return \`-1\`.

**Example 1:**
Input: arr = [4, 5, 6, 7, 0, 1, 2], target = 0
Output: 4
Explanation: The number 0 is located at index 4 in the array.

**Example 2:**
Input: arr = [4, 5, 6, 7, 0, 1, 2], target = 3
Output: -1
Explanation: The number 3 is not present in the array, so we return -1.

**Constraints:**
• 1 <= arr.length <= 10^4
• -10^5 <= arr[i], target <= 10^5
• You must build a Linear Search using blocks: Loop through the array, compare each element one by one, and return the index upon finding the match.`
  },
  {
    id: "l2-t2",
    templatePath: "activities/binary_search_act",
    title: "5. Binary Search",
    difficulty: "Easy",
    task: `You are given an array of integers \`arr\` which is strictly sorted in ascending order, and an integer \`target\`. Write a function to search for the \`target\` in \`arr\`. If the \`target\` exists, then return its index. Otherwise, return \`-1\`. 

Because the array is already sorted, you can optimize your search. Instead of checking every element sequentially, you should repeatedly divide the search interval in half.

**Example 1:**
Input: arr = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4.

**Example 2:**
Input: arr = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1.

**Constraints:**
• 1 <= arr.length <= 10^4
• -10^4 < arr[i], target < 10^4
• All the integers in \`arr\` are unique.
• \`arr\` is sorted in ascending order.
• You **must** write an algorithm with $O(\\log n)$ runtime complexity.`
  },

  // --- LESSON 3: SORTING ALGORITHMS ---
  {
    id: "l3-t1",
    templatePath: "activities/bubble_sort_act",
    title: "6. Bubble Sort",
    difficulty: "Easy",
    task: `You are given an array of integers \`arr\`. Your task is to sort the array in ascending order and return it. You must solve the problem using the **Bubble Sort** algorithm. 

Bubble Sort works by repeatedly swapping adjacent elements if they are in the wrong order. With each full pass through the array, the largest unsorted element "bubbles up" to its correct position at the end of the array. You must continue making passes until no more swaps are needed.

**Example 1:**
Input: arr = [5, 2, 3, 1]
Output: [1, 2, 3, 5]
Explanation: 
Pass 1: [2, 5, 3, 1] -> [2, 3, 5, 1] -> [2, 3, 1, 5] (5 is sorted)
Pass 2: [2, 3, 1, 5] -> [2, 1, 3, 5] (3 is sorted)
Pass 3: [1, 2, 3, 5] (Array is fully sorted)

**Constraints:**
• 1 <= arr.length <= 1000
• -5000 <= arr[i] <= 5000
• Modify the array in-place without using extra memory for another array.`
  },
  {
    id: "l3-t2",
    templatePath: "activities/selection_sort_act",
    title: "7. Selection Sort",
    difficulty: "Easy",
    task: `You are given an array of integers \`arr\`. Your task is to sort the array in ascending order and return it using the **Selection Sort** algorithm.

Selection Sort divides the input array into two parts: a sorted sublist of items which is built up from left to right at the front (left) of the array, and a sublist of the remaining unsorted items that occupy the rest of the array. Initially, the sorted sublist is empty. The algorithm proceeds by finding the smallest element in the unsorted sublist, exchanging (swapping) it with the leftmost unsorted element, and moving the sublist boundaries one element to the right.

**Example 1:**
Input: arr = [64, 25, 12, 22, 11]
Output: [11, 12, 22, 25, 64]

**Constraints:**
• 1 <= arr.length <= 1000
• -10^4 <= arr[i] <= 10^4
• Find the minimum element in the unsorted portion and swap it to the front.`
  },
  {
    id: "l3-t3",
    templatePath: "activities/insertion_sort_act",
    title: "8. Insertion Sort",
    difficulty: "Easy",
    task: `You are given an array of integers \`arr\`. Sort the array in ascending order and return it using the **Insertion Sort** algorithm.

Insertion Sort iterates, consuming one input element each repetition, and growing a sorted output list. At each iteration, it removes one element from the input data, finds the location it belongs within the sorted list, and inserts it there. It repeats until no input elements remain. This is similar to how you might sort playing cards in your hands.

**Example 1:**
Input: arr = [12, 11, 13, 5, 6]
Output: [5, 6, 11, 12, 13]

**Constraints:**
• 1 <= arr.length <= 1000
• -5000 <= arr[i] <= 5000
• Shift larger elements to the right to insert the current element in its correct sequential order.`
  },
  {
    id: "l3-t4",
    templatePath: "activities/merge_sort_act",
    title: "9. Merge Sort",
    difficulty: "Medium",
    task: `You are given an array of integers \`arr\`. Sort the array in ascending order and return it. You must solve the problem using the **Merge Sort** algorithm.

Merge Sort is a divide-and-conquer algorithm. It works by recursively breaking down a problem into two or more sub-problems of the same or related type, until these become simple enough to be solved directly (arrays of size 1 are inherently sorted). The solutions to the sub-problems are then combined (merged) to give a solution to the original problem.

**Example 1:**
Input: arr = [12, 11, 13, 5, 6, 7]
Output: [5, 6, 7, 11, 12, 13]

**Constraints:**
• 1 <= arr.length <= 5 * 10^4
• -50000 <= arr[i] <= 50000
• You must write an algorithm with $O(n \\log n)$ runtime complexity.`
  },

  // --- LESSON 4: RECURSION ---
  {
    id: "l4-t1",
    templatePath: "activities/factorial_recursive_act",
    title: "10. Factorial (Recursive)",
    difficulty: "Easy",
    task: `You are given a non-negative integer \`n\`. Your task is to compute and return the factorial of \`n\`, mathematically denoted as \`n!\`. 

The factorial of a non-negative integer \`n\` is the product of all positive integers less than or equal to \`n\`. For example, \`4! = 4 * 3 * 2 * 1 = 24\`. By definition, the value of \`0!\` is \`1\`.

**Example 1:**
Input: n = 4
Output: 24
Explanation: 4 * 3 * 2 * 1 = 24

**Example 2:**
Input: n = 0
Output: 1
Explanation: The base case of 0! is defined as 1.

**Constraints:**
• 0 <= n <= 12
• You **must** solve the problem using a recursive algorithm. Do not use iterative loops (\`for\` or \`while\`). Ensure you have a clear base case to prevent an infinite call stack.`
  },
  {
    id: "l4-t2",
    templatePath: "activities/fibonacci_recursive_act",
    title: "10. Fibonacci Number",
    difficulty: "Easy",
    task: `The Fibonacci numbers, commonly denoted \`F(n)\`, form a sequence called the Fibonacci sequence, such that each number is the sum of the two preceding ones. The sequence starts from \`0\` and \`1\`. 

The sequence is defined mathematically as:
$F(0) = 0, F(1) = 1$
$F(n) = F(n-1) + F(n-2)$, for $n > 1$.

Given an integer \`n\`, calculate and return the \`n\`-th Fibonacci number \`F(n)\`.

**Example 1:**
Input: n = 2
Output: 1
Explanation: F(2) = F(1) + F(0) = 1 + 0 = 1.

**Example 2:**
Input: n = 4
Output: 3
Explanation: F(4) = F(3) + F(2) = 2 + 1 = 3.

**Constraints:**
• 0 <= n <= 30
• You **must** solve the problem using a recursive algorithm.`
  },
  {
    id: "l4-t3",
    templatePath: "activities/permutation_recursive_act",
    title: "11. Permutations",
    difficulty: "Medium",
    task: `You are given an array \`nums\` consisting of distinct integers. A permutation is a mathematical technique that determines the number of possible arrangements in a set when the order of the arrangements matters.

Your task is to compute and return all the possible permutations of the elements in \`nums\`. You can return the final list of permutations in any order.

**Example 1:**
Input: nums = [1,2,3]
Output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
Explanation: There are 3! (6) distinct ways to arrange the 3 unique numbers.

**Example 2:**
Input: nums = [0,1]
Output: [[0,1],[1,0]]

**Constraints:**
• 1 <= nums.length <= 6
• -10 <= nums[i] <= 10
• All the integers of \`nums\` are guaranteed to be unique.
• You must solve the problem using recursion (often referred to as backtracking in this context).`
  }
];

// Utility to render basic Markdown (bold and inline code)
const renderFormattedTask = (text) => {
  if (!text) return null;
  const formattedHtml = text
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #26004a;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 4px; font-family: monospace; color: #4400ff;">$1</code>');
  
  return <div dangerouslySetInnerHTML={{ __html: formattedHtml }} />;
};

const ActivityApp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const saveLessonProgress = async (lessonId, score) => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);

    try {
      const response = await fetch("/api/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          lesson_id: lessonId,
          score: score // Passes the numerical score
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Updates local storage so LearningPath sees it instantly
        user.progress = data.progress;
        localStorage.setItem("user", JSON.stringify(user));
        
        console.log(`Progress saved! Lesson: ${lessonId}, Score: ${score}`);
      }
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  // EXAMPLE USAGE: Call this when they click "Submit" or pass the lesson
  const handleLessonComplete = () => {
    const finalScore = 100; // Calculate their actual score
    const currentLesson = "bubble_sort_act"; // Get the current activity ID
    
    saveLessonScore(currentLesson, finalScore);
    // show success modal, etc.
  };

  const handleSuccess = async () => {
    // 1. Get the current activity ID (e.g., from your URL params or state)
    const currentLessonId = "bubble_sort_act"; 
    
    // 2. Calculate their score (or just pass 100 if they finished it)
    const finalScore = 100; 
    
    // 3. Call our unified function
    await saveLessonProgress(currentLessonId, finalScore);
    
    // 4. (Optional) Show a success message or redirect them
    alert("Activity Completed!");
    setTimeout(() => navigate("/learning-path"), 1500);
  };
  
  const activityData = location.state?.activityData || null;
  const initialTemplate = location.state?.templatePath || "";

  // Find the matching task from our static LeetCode list
  const currentTask = ACTIVITY_TASKS.find(t => t.templatePath === initialTemplate);

  const workspaceRef = useRef(null);

  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState(""); 
  const [viewMode, setViewMode] = useState("workspace");
  const [passedTests, setPassedTests] = useState(0);

  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

  const [expandedTests, setExpandedTests] = useState({ 0: true });

  const [bottomPanel, setBottomPanel] = useState(null); 
  const [activeTab, setActiveTab] = useState("time_asymptotic");
  const [analysisResult, setAnalysisResult] = useState({ 
    lines: [], recurrence_lines: [], total: "O(1)", total_recurrence: "O(1)", space_lines: [], space_total: "O(1)", is_recursive: false
  });

  // --- CONFIRM MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    isDanger: false,
    onConfirmAction: null
  });

  // HELPER: Close the modal
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

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

  // --- NEW RUN CODE FUNCTION (NO TESTS) ---
  const runCode = async () => {
    setBottomPanel("console");
    setConsoleOutput("> Running Code...\n");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedPython }),
      });
      const data = await response.json();
      
      const outputText = data.status === "success" ? data.output : "> Error: " + data.output;
      setConsoleOutput(outputText);
    } catch {
      setConsoleOutput("> Connection Error while running code.");
    }
  };

  // --- RUN TEST CASES FUNCTION ---
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
        
        {/* ADDED RUN CODE BUTTON NEXT TO RUN TESTS */}
        <div className="activity-actions" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="activity-action-btn" 
            onClick={runCode}
            style={{ backgroundColor: '#2D234A', border: '1px solid #6C5CE7', color: '#EBE4FF' }}
            title="Run code in console without submitting to test cases"
          >
            ▷ Run Code
          </button>
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
              <img src="/assets/console-icon.png" alt="Icon" style={{ width: '24px' }}/>
              Description
            </h2>
          </div>
          
          <div className="activity-panel-content">
            <div className="activity-task-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', marginTop: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#2b005c', fontWeight: 'bold' }}>
                  {currentTask?.title || activityData.title}
                </h2>
                <span style={{
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold',
                    backgroundColor: currentTask?.difficulty === 'Easy' ? 'rgba(0, 184, 163, 0.15)' : currentTask?.difficulty === 'Medium' ? 'rgba(255, 192, 30, 0.15)' : 'rgba(255, 55, 95, 0.15)',
                    color: currentTask?.difficulty === 'Easy' ? '#00b8a3' : currentTask?.difficulty === 'Medium' ? '#ffc01e' : '#ff375f'
                }}>
                    {currentTask?.difficulty || "Easy"}
                </span>
            </div>

            <div className="activity-card" style={{ 
                lineHeight: '1.7', 
                fontSize: '0.95rem',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0',
                color: '#2f2f2f'
            }}>
              {renderFormattedTask(currentTask?.task || activityData.task)}
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
                 setModalConfig({
                   isOpen: true,
                   title: "Restart Activity?",
                   message: "Are you sure you want to restart this activity? Your progress will be lost.",
                   confirmText: "Restart",
                   isDanger: true,
                   onConfirmAction: () => {
                     window.location.reload();
                   }
                 });
               }} title="Restart Activity">
                 <img src="/assets/recursive-icon.png" alt="Restart" />
               </button>
            </div>
          </footer>

        </main>

        <aside className="activity-right-panel">
          <div className="activity-panel-header">
            <h3>Test Cases</h3>
            <span className="test-cases-counter">{passedTests}/{totalTests} passed</span>
          </div>
          
          <div className="activity-panel-content">
            {activityData.testCasesList?.map((tc, i) => {
              const testIdentifier = `Test ${i + 1}`;
              const isPassing = consoleOutput.includes(`${testIdentifier} Passed`);
              const isFailing = consoleOutput.includes(`${testIdentifier} Failed`);
              const isError = consoleOutput.includes(`${testIdentifier} Error`);
              
              const isExpanded = expandedTests[i];
              const statusClass = isPassing ? 'passing' : (isFailing || isError) ? 'failing' : '';

              return (
                <div key={i} className={`test-case-card ${statusClass}`}>
                  
                  <div className="test-case-header" onClick={() => toggleTest(i)}>
                    <div className="test-case-header-left">
                      <div className={`test-case-indicator ${statusClass}`}></div>
                      <strong className="test-case-title">Test {i + 1}</strong>
                    </div>
                    <span className={`test-case-chevron ${isExpanded ? 'open' : ''}`}>❯</span>
                  </div>
                  
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

    {/* RENDER THE CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDanger={modalConfig.isDanger}
        onCancel={closeModal}
        onConfirm={modalConfig.onConfirmAction}
      />
    </div>
  );
};

export default ActivityApp;