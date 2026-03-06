import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import "../styles/LearningPath.css";

const LESSONS = [
  {
    id: "l1",
    number: "LESSON 1",
    title: "Introduction to Algorithms",
    topics: [
      {
        id: "l1-t1",
        number: "TOPIC 1",
        title: "What is an Algorithm?",
        level: "beginner",
        teaching: `Welcome to the world of algorithms! Before writing any code, programmers must master the logic behind it.

An algorithm is essentially a set of step-by-step instructions for solving a problem or completing a task. You can think of an algorithm exactly like a recipe for preparing a meal—it lists the ingredients (inputs) and gives you exact steps to achieve the desired result (output). Algorithms are fundamental because they tell computers exactly what actions to take to complete a task.

For a sequence of instructions to truly be considered a formal algorithm, it must possess these five key characteristics:

1. Input: It should have clearly defined inputs (or zero inputs).
2. Output: It must produce at least one expected output.
3. Definiteness (Clear and Unambiguous): Every step must be precisely defined, leaving no room for confusion.
4. Finiteness: The algorithm must eventually end after a finite number of steps; it cannot run forever.
5. Effectiveness: Each step must be basic enough that it can be carried out practically and within a finite amount of time.`,
        algorithmSteps: `The 5-Step Problem-Solving Process:

Step 1: Understand the Problem
        -> Identify knowns, unknowns, and edge cases.
Step 2: Analyze the Problem
        -> Break the problem into smaller components.
Step 3: Design the Algorithm
        -> Create a step-by-step plan (pseudocode or flowchart).
Step 4: Implement the Solution
        -> Convert your logic into an actual programming language.
Step 5: Test and Evaluate
        -> Check for correctness, efficiency, and robustness.`,
        references: [
          { text: "Introduction to Algorithms, Fourth Edition, Thomas H. Cormen, et al.", url: "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/" },
          { text: "Simplilearn: What is An Algorithm? Definition, Working, and Types", url: "https://www.simplilearn.com/tutorials/data-structure-tutorial/what-is-an-algorithm" },
          { text: "GeeksforGeeks: What is an Algorithm | Introduction to Algorithms", url: "https://www.geeksforgeeks.org/introduction-to-algorithms/" }
        ],
        task: "Familiarize yourself with the visual blocks. Connect a simple sequence of Output blocks to print 'Hello' and 'World'.",
        testCases: 1,
        templatePath: "intro/what_is_algo"
      },
      {
        id: "l1-t2",
        number: "TOPIC 2",
        title: "Logic & Flow",
        level: "beginner",
        teaching: `Now that we know what an algorithm is, how do we structure its logic? No matter how complex a computer program might seem, its flow is ultimately built on three fundamental concepts called control structures:

1. Sequence: This is the most basic control structure. It simply means that programming instructions are executed line-by-line, in the exact order they are written. The code runs straight from top to bottom.
2. Selection (Conditional): In programming, we often need to make decisions based on certain conditions. Selection lets the program choose different paths of execution, evaluating whether a condition is true or false (using keywords like 'if' and 'else').
3. Iteration (Looping): Iteration refers to repeating a set of actions multiple times as long as a certain condition holds true. We use loops like 'for' or 'while' to efficiently execute repeated tasks.

By mastering sequence, selection, and iteration, you hold the building blocks to solve almost any logical challenge!`,
        algorithmSteps: `Translating Pseudocode to Execution
Problem: Check if a number is Even or Odd.

START
  Input N
  if (N modulo 2 == 0) then
    Output "The number is Even" (Selection)
  else
    Output "The number is Odd" (Selection)
  end if
END`,
        references: [
          { text: "Study.com: Basic Constructs in Programming", url: "https://study.com/academy/lesson/basic-constructs-in-programming-sequence-selection-iteration.html" },
          { text: "GeeksforGeeks: Control Structures in Programming Languages", url: "https://www.geeksforgeeks.org/control-structures-in-programming-languages/" }
        ],
        task: "Use an If-Else block to check a condition. If the condition is true, output 'Yes', otherwise output 'No'.",
        testCount: 3,
        templatePath: "intro/logic_flow"
      }
    ]
  },
  {
    id: "l2",
    number: "LESSON 2",
    title: "Brute Force Algorithms",
    topics: [
      {
        id: "l2-t1",
        number: "TOPIC 1",
        title: "Linear Search",
        level: "beginner",
        teaching: `Brute force (also called exhaustive search) is a straightforward problem-solving paradigm. Algorithms in this category systematically enumerate and check all possible candidate solutions until they find one that satisfies the problem. They rely on sheer computing power rather than clever shortcuts.

Linear search (or sequential search) is a classic brute-force method used to find a value in an array or list. It simply checks each element one by one from the beginning until it finds the target. 

While it is perfectly simple and guaranteed to find a solution if one exists, it is highly inefficient for massive datasets. In the worst-case scenario (if the item is at the very end or doesn't exist), the algorithm must scan all 'n' elements, giving it a time complexity of O(n). However, it requires virtually no extra memory, resulting in an excellent space complexity of O(1).`,
        algorithmSteps: `Linear Search Procedure:

1. Start at the first element (index i = 0) of the array A.
2. Compare the current element A[i] with the target key.
3. If they match, return the index i (Found!).
4. If they do not match, move to the next element (i = i + 1).
5. Repeat steps 2-4 until the end of the array is reached.
6. If the array ends and the target is not found, return -1.`,
        references: [
          { text: "Khan Academy: Linear Search", url: "https://www.khanacademy.org/computing/computer-science/algorithms/intro-to-algorithms/a/linear-search" },
          { text: "Programiz: Linear Search Algorithm", url: "https://www.programiz.com/dsa/linear-search" }
        ],
        task: "Build a Linear Search using blocks: Use a Loop to iterate the array, Compare to check each element, and return the index if found.",
        testCases: 3,
        templatePath: "search/linear_search"
      },
      {
        id: "l2-t2",
        number: "TOPIC 2",
        title: "Bubble Sort",
        level: "beginner",
        teaching: `Bubble sort is a simple, brute-force comparison-based sorting algorithm. It repeatedly steps through a list, compares adjacent elements, and swaps them if they are in the wrong order. 

It gets its name because with each pass, the largest remaining value "bubbles up" to its correct position at the end of the list. Because it exhausts all possibilities without optimization, Bubble Sort is typically used as an educational stepping stone rather than in practical, real-world applications.

Performance Analysis:
• Worst/Average Case Time Complexity: O(n²). For an array of size n, it makes roughly n² comparisons, making it incredibly slow for large lists.
• Best Case Time Complexity: O(n). If the list is already sorted, an optimized version can stop early.
• Space Complexity: O(1). It sorts the array "in-place", requiring no additional memory arrays.`,
        algorithmSteps: `Bubble Sort Procedure:

1. Make multiple passes over the array from start to end.
2. On each pass, iterate through the unsorted portion of the array.
3. Compare adjacent elements A[j] and A[j+1].
4. If A[j] > A[j+1], swap their positions.
5. After one full pass, the largest element is locked in place at the end.
6. Repeat the process for the remaining elements.
7. (Optimization) If a full pass occurs with ZERO swaps, the array is sorted. Stop early!`,
        references: [
          { text: "GeeksforGeeks: Bubble Sort Algorithm", url: "https://www.geeksforgeeks.org/bubble-sort/" },
          { text: "HackerEarth: Sorting Algorithms - Bubble Sort", url: "https://www.hackerearth.com/practice/algorithms/sorting/bubble-sort/tutorial/" }
        ],
        task: "Build a Bubble Sort using nested loops and an if-condition to swap elements that are out of order.",
        testCount: 3,
        templatePath: "sort/bubble_sort"
      }
    ]
  },
  {
    id: "l3",
    number: "LESSON 3",
    title: "Recursion & Recurrence",
    topics: [
      {
        id: "l3-t1",
        number: "TOPIC 1",
        title: "Recursive Algorithms",
        level: "intermediate",
        teaching: `In computer science, we often encounter problems that can be broken down into smaller, identical subproblems. Recursion is a programming technique where a function calls itself to solve these smaller instances.

When analyzing the time complexity of recursive algorithms, we use "Recurrence Relations." A recurrence relation is a mathematical equation that expresses the running time of a problem in terms of its smaller inputs.

Every properly designed recursive algorithm MUST contain two distinct parts:
1. Base Case: The condition where the recursion terminates. It specifies the result for the smallest, simplest input size without calling itself again. Without a base case, recursion leads to infinite loops and stack overflows!
2. Recursive Step: The part where the function calls itself with a smaller input, moving closer to the base case.

A classic example is finding the Factorial of a number (n!), which mathematically translates to n * (n-1)!.`,
        algorithmSteps: `Recursive Procedure (Factorial Example):

Function Factorial(n):
  1. Check the Base Case:
     If n == 0 or n == 1, return 1.
  2. Execute the Recursive Step:
     Return n multiplied by the result of Factorial(n - 1).
  
Example Execution Trace for Factorial(4):
  Factorial(4) returns 4 * Factorial(3)
  Factorial(3) returns 3 * Factorial(2)
  Factorial(2) returns 2 * Factorial(1)
  Factorial(1) returns 1 (Base Case reached!)
  Result propagates back up: 1 * 2 * 3 * 4 = 24.`,
        references: [
          { text: "GeeksforGeeks: Introduction to Recursion", url: "https://www.geeksforgeeks.org/introduction-to-recursion-data-structure-and-algorithm-tutorials/" },
          { text: "FreeCodeCamp: Understanding Recursion in Programming", url: "https://www.freecodecamp.org/news/understanding-recursion-in-programming/" }
        ],
        task: "Complete the recursive algorithm structure to calculate a factorial.",
        testCount: 3,
        templatePath: "recursive/recursive_factorial"
      }
    ]
  },
  {
    id: "l4",
    number: "LESSON 4",
    title: "Divide and Conquer",
    topics: [
      {
        id: "l4-t1",
        number: "TOPIC 1",
        title: "Binary Search",
        level: "intermediate",
        teaching: `Divide and Conquer is a highly efficient problem-solving paradigm where a large problem is broken down into smaller subproblems, solved recursively, and combined to form the final solution.

Binary Search is a classic Divide and Conquer algorithm used exclusively on sorted arrays. Instead of checking every single element (like Linear Search does), Binary Search repeatedly divides the search space in half. 

It follows the core paradigm steps:
1. Divide: Find the middle element.
2. Conquer: If the middle element is the target, you're done! Otherwise, if the target is smaller, search only the left half. If larger, search only the right half.
3. Combine: No explicit combination is needed for searching.

Because it halves the remaining elements with every single step, its worst-case time complexity is incredibly fast: O(log n).`,
        algorithmSteps: `Binary Search Procedure:

1. Set 'low' index to 0 and 'high' index to n-1.
2. While 'low' is less than or equal to 'high':
   a. Calculate the 'mid' index: (low + high) / 2.
   b. Compare A[mid] with the target key.
   c. If A[mid] == target, return 'mid' (Found!).
   d. If target < A[mid], set 'high' to mid - 1 (Discard right half).
   e. If target > A[mid], set 'low' to mid + 1 (Discard left half).
3. If the loop ends naturally, the target is not in the array. Return -1.`,
        references: [
          { text: "Khan Academy: Binary Search", url: "https://www.khanacademy.org/computing/computer-science/algorithms/binary-search/a/binary-search" },
          { text: "GeeksforGeeks: Binary Search Algorithm", url: "https://www.geeksforgeeks.org/binary-search/" }
        ],
        task: "Calculate the middle index, and iteratively search the left or right half based on whether the target is greater or smaller.",
        testCases: 4,
        templatePath: "search/binary_search"
      },
      {
        id: "l4-t2",
        number: "TOPIC 2",
        title: "Merge Sort",
        level: "advanced",
        teaching: `Merge Sort is a stable, comparison-based sorting algorithm that fully utilizes the Divide and Conquer strategy. Rather than sorting a large list blindly, it systematically fragments the problem and builds it back up.

Merge Sort guarantees a phenomenal time complexity of O(n log n) in its best, average, and worst cases, making it vastly superior to Bubble Sort for large datasets.

How it applies Divide and Conquer:
1. Divide: Split the array exactly into two halves down to single-element sub-arrays.
2. Conquer: Recursively sort the two halves. (Note: An array of 1 element is already naturally sorted!).
3. Combine: Meticulously merge the two sorted halves back together into a single sorted array.

One trade-off is its space complexity: Merge Sort requires O(n) auxiliary memory to hold the arrays while merging them together.`,
        algorithmSteps: `Merge Sort Procedure:

Function MergeSort(Array):
  1. If the Array has 1 or 0 elements, it is already sorted. Return the Array.
  2. Divide: Find the midpoint and split the Array into LeftHalf and RightHalf.
  3. Conquer: Recursively call MergeSort(LeftHalf) and MergeSort(RightHalf).
  4. Combine: Call a Merge() function to compare elements from both halves one by one, 
     placing the smaller element sequentially into a new sorted array.
  5. Return the fully merged and sorted array.

Example Execution: [8,3,5,2]
Split -> [8,3] and [5,2]
Split -> [8], [3], [5], [2]
Merge -> [3,8] and [2,5]
Merge -> [2,3,5,8]`,
        references: [
          { text: "GeeksforGeeks: Merge Sort Algorithm", url: "https://www.geeksforgeeks.org/merge-sort/" },
          { text: "Programiz: Merge Sort", url: "https://www.programiz.com/dsa/merge-sort" }
        ],
        task: "Implement the divide step by splitting the array in half, and the combine step to merge two sorted arrays into one.",
        testCount: 3,
        templatePath: "sort/merge_sort"
      }
    ]
  }
];



export default function LearningPath() {
  const navigate = useNavigate();
  const [expandedTopic, setExpandedTopic] = useState(null);

  const toggleTopic = (topicId) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleStartActivity = (templatePath) => {
    navigate("/activity", { 
      state: { 
        templatePath: topic.templatePath, 
        activityData: activityDataWithTests 
      } 
    });
  };

  // --- Test Case Generators ---

// Generator for Factorial
const generateFactorialTest = (testCount) => {
  const tests = [];
  // Use a Set to ensure we don't test the same number twice
  const usedNumbers = new Set();
  
  while (tests.length < testCount) {
    const n = Math.floor(Math.random() * 7) + 1; // Random number 1-7
    if (!usedNumbers.has(n)) {
      usedNumbers.add(n);
      let expected = 1;
      for (let i = 1; i <= n; i++) expected *= i;
      tests.push({ call: `factorial(${n})`, expected: `${expected}` });
    }
  }
  return tests;
};

// Generator for Fibonacci
const generateFibonacciTest = (testCount) => {
  const tests = [];
  const usedNumbers = new Set();
  const fib = (x) => (x <= 1 ? x : fib(x - 1) + fib(x - 2));

  while (tests.length < testCount) {
    const n = Math.floor(Math.random() * 10) + 1; // Random number 1-10
    if (!usedNumbers.has(n)) {
      usedNumbers.add(n);
      tests.push({ call: `fibonacci(${n})`, expected: `${fib(n)}` });
    }
  }
  return tests;
};

// Generator for Sorting Algorithms (Bubble, Insertion, Merge, Selection)
const generateSortTest = (testCount) => {
  const tests = [];
  for (let i = 0; i < testCount; i++) {
    const len = Math.floor(Math.random() * 6) + 3; // Array length 3 to 8
    const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 50));
    const sortedArr = [...arr].sort((a, b) => a - b);
    
    tests.push({ 
      call: `sort_array([${arr.join(", ")}])`, 
      expected: `[${sortedArr.join(", ")}]` 
    });
  }
  return tests;
};

// Generator for Search Algorithms (Linear, Binary)
const generateSearchTest = (testCount) => {
  const tests = [];
  for (let i = 0; i < testCount; i++) {
    const len = Math.floor(Math.random() * 6) + 4; // Array length 4 to 9
    const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 50)).sort((a, b) => a - b);
    
    // Force the first test to find an item, and the second test to NOT find an item (Edge case testing)
    let exists = Math.random() > 0.3;
    if (i === 0) exists = true;
    if (i === 1) exists = false;

    let target;
    let expected;

    if (exists) {
      const randomIndex = Math.floor(Math.random() * len);
      target = arr[randomIndex];
      expected = randomIndex;
    } else {
      target = 999; // Missing element
      expected = -1; 
    }

    tests.push({ 
      call: `search([${arr.join(", ")}], ${target})`, 
      expected: `${expected}` 
    });
  }
  return tests;
};

  return (
    <div className="learning-path-page">
      <DashboardHeader />

      <main className="lp-main">
        <div className="lp-back-container">
          <Link to="/dashboard" className="lp-back-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lp-back-icon">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="lp-hero">
          <div className="lp-hero-icon">
            <img src="/assets/learning-icon.png" alt="Learning" />
          </div>
          <div className="lp-hero-text">
            <h2>Learning Path</h2>
            <p>Master algorithms step-by-step</p>
          </div>
        </div>

        <div className="lp-info-box">
          Read the module teachings, study the algorithm scripts, and complete the interactive tasks to advance!
        </div>

        <div className="lp-lessons">
          {LESSONS.map((lesson) => (
            <div key={lesson.id} className="lp-lesson-card">
              <div className="lp-lesson-header">
                <img src="/assets/book-icon.png" alt="Book" className="lp-book-icon" />
                <div className="lp-lesson-title-group">
                  <span className="lp-lesson-number">{lesson.number}</span>
                  <h3 className="lp-lesson-title">{lesson.title}</h3>
                </div>
              </div>

              <div className="lp-topics">
                {lesson.topics.map((topic) => {
                  const isExpanded = expandedTopic === topic.id;
                  return (
                    <div key={topic.id} className={`lp-topic-container ${isExpanded ? "expanded" : ""}`}>
                      <div className="lp-topic-row" onClick={() => toggleTopic(topic.id)}>
                        <div className="lp-topic-row-left">
                          <span className="lp-topic-arrow">
                            {isExpanded ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BCA1FC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BCA1FC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            )}
                          </span>
                          <div className="lp-topic-titles">
                            <span className="lp-topic-number">{topic.number}</span>
                            <h4 className="lp-topic-name">{topic.title}</h4>
                          </div>
                        </div>
                        <div className="lp-topic-badge">{topic.level}</div>
                      </div>

                      {isExpanded && (
                        <div className="lp-topic-content">
                          
                          <div className="lp-teaching-section">
                            <strong className="lp-teaching-title">Module Lesson:</strong>
                            <p className="lp-topic-teaching">{topic.teaching}</p>
                          </div>
                          
                          <div className="lp-algorithm-steps">
                            <strong className="lp-steps-title">Algorithm Procedure:</strong>
                            <div className="lp-code-block">
                              <pre>
                                <code>{topic.algorithmSteps}</code>
                              </pre>
                            </div>
                          </div>

                          <div className="lp-topic-task">
                            <strong className="lp-task-title">Your Mission:</strong>
                            <p className="lp-task-desc">{topic.task}</p>
                          </div>

                          {topic.references && (
                            <div className="lp-references-section">
                              <strong className="lp-references-title">References:</strong>
                              <ul className="lp-references-list">
                                {topic.references.map((ref, idx) => (
                                  <li key={idx}>
                                    {/* Using <a> tags to make the references clickable */}
                                    <a 
                                      href={ref.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="lp-reference-link"
                                    >
                                      {ref.text}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="lp-topic-footer">
                            <span className="lp-test-cases">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F57F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="16" y2="14"></line><line x1="8" y1="18" x2="12" y2="18"></line></svg>
                              {topic.testCases} test cases
                            </span>
                            <button 
                              className="lp-start-btn"
                              onClick={() => handleStartActivity(topic.templatePath)}
                            >
                              Start Activity
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}