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
        teaching: `Welcome to Algorithm and Complexity! Before we write code, we must understand the logical structure behind it. 

An algorithm is defined as a precise, step-by-step procedure or set of rules designed to perform a specific task or solve a particular problem. It serves as the logical foundation of a program, but it is not the program itself. Think of it like a recipe for cooking spaghetti—it tells you exactly what steps to follow to achieve the desired result. Studying algorithms is essential because they solve computational problems efficiently, improve software performance, and form the backbone of Computer Science.

A good algorithm must possess the following properties:
1. Input: Zero or more inputs are provided.
2. Output: At least one output is produced.
3. Definiteness: Each step is precisely and unambiguously defined.
4. Finiteness: The algorithm must terminate after a finite number of steps.
5. Effectiveness: All operations can be performed practically and in a finite time.`,
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
          "Introduction to Algorithms, Fourth Edition, Thomas H. Cormen, et al. (2022)",
          "Design and Analysis of Algorithms, 3rd Edition, Levitin, Anany"
        ],
        task: "Familiarize yourself with the visual blocks. Connect a simple sequence of Output blocks to print 'Hello' and 'World'.",
        testCases: 1,
        templatePath: "intro/what_is_algo"
      },
      {
        id: "l1-t2",
        number: "TOPIC 2",
        title: "Algorithm Representation",
        level: "beginner",
        teaching: `Once a solution to a problem is designed, the next crucial step is to represent the algorithm clearly. This helps programmers, designers, and stakeholders understand and communicate the logic before it is translated into code, allowing for early error detection and better collaboration.

Common Forms of Algorithm Representation:
1. Natural Language (Plain English): Writing steps in everyday language. It is easy to understand quickly but can be vague or ambiguous.
2. Pseudocode: An informal, structured, language-like notation used to describe an algorithm's steps without strict syntax. It is more formal than plain English and easy to convert into actual code, making it excellent for planning.
3. Flowcharts: A graphical representation using standard symbols (like diamonds for decisions and rectangles for processes) to visually show the flow of control.
4. Structured Charts: Breaking an algorithm into modular components and displaying them hierarchically (top-down design).
5. Code: The final implementation in a programming language. It is not ideal as a first step because it mixes pure logic with language-specific syntax.`,
        algorithmSteps: `Translating Pseudocode to Execution
Problem: Given two numbers, find their sum.

START
  Input A, B
  Sum <- A + B
  Output Sum
END`,
        references: [
          "C++ Data Structures and Algorithm Design Principles, John Carey et al. (2019)",
          "Algorithms: Design Techniques and Analysis, 2nd Edition. M. H. Alsuwaiyel (2021)"
        ],
        task: "Use an If-Else block to check a condition. If the condition is true, output 'Yes', otherwise output 'No'.",
        testCases: 2,
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
        teaching: "Imagine looking for a specific book in a disorganized pile. You would check every single book one by one until you find it. That's exactly how Linear Search works! It is a 'Brute Force' algorithm, meaning it systematically enumerates and checks all possible candidates for whether they satisfy the problem. While it is simple and guaranteed to find the answer if it exists, it can be slow for very large lists.",
        algorithmSteps: `1. Given an array A[0..n-1] and a target key.
2. Start at index 0 and compare A[i] to the target key.
3. If they match, return the current index i.
4. Otherwise, move to the next element (i + 1).
5. Continue this process until the value is found or the array ends.
6. If the array ends without finding the key, return -1.`,
        task: "Build a Linear Search using blocks: Use a Loop to iterate the array, Compare to check each element, and return the index if found.",
        testCases: 3,
        templatePath: "search/linear_search"
      },
      {
        id: "l2-t2",
        number: "TOPIC 2",
        title: "Bubble Sort",
        level: "beginner",
        teaching: "Have you ever noticed how larger bubbles rise to the surface of a glass of soda? Bubble sort works similarly! It is a simple comparison-based sorting algorithm that repeatedly steps through the list and swaps adjacent elements if they are in the wrong order. Because large values 'bubble up' to the end of the list on each pass, it gets its name.",
        algorithmSteps: `1. Make multiple passes over the array.
2. On each pass i, loop through the unsorted portion: compare A[j] and A[j+1].
3. If A[j] > A[j+1], swap their positions.
4. After the first full pass, the largest element has 'bubbled' to the last position.
5. Repeat the process for the remaining elements.
6. (Optional) Stop early if no swaps occur in a pass.`,
        task: "Build a Bubble Sort using nested loops and an if-condition to swap elements that are out of order.",
        testCases: 4,
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
        teaching: "Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem. Recursion simplifies problems that can be broken into smaller subproblems.\n\nA recursive algorithm usually contains two main parts:\n• Base Case: The condition that stops the recursion.\n• Recursive Case: The part where the function calls itself with a smaller input.",
        algorithmSteps: `Recursive Definition (Factorial)

factorial(n):
  if n <= 1 return 1
  else return n × factorial(n-1)

Example Breakdown:
5! = 5 × 4 × 3 × 2 × 1
   = 5 × factorial(4)
   = 5 × (4 × factorial(3)) ...`,
        task: "Complete the recursive algorithm structure.",
        testCases: 2,
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
        title: "Merge Sort",
        level: "intermediate",
        teaching: "Merge Sort is a highly efficient sorting algorithm that fully utilizes the Divide and Conquer strategy. It is a divide-and-conquer algorithm that divides a list into smaller parts, sorts them, and then merges them back together.",
        algorithmSteps: `Steps:
1. Divide the array into two halves.
2. Recursively sort each half.
3. Merge the sorted halves.

Example Execution: [8,3,5,2]
Split -> [8,3] and [5,2]
Split -> [8], [3], [5], [2]
Merge -> [3,8] and [2,5]
Merge -> [2,3,5,8]`,
        task: "Implement the divide step by splitting the array in half, and the combine step to merge two sorted arrays into one.",
        testCases: 4,
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
    navigate("/app", { state: { templatePath } });
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
                          
                          {/* Rich Teaching Section */}
                          <div className="lp-teaching-section">
                            <strong className="lp-teaching-title">Module Lesson:</strong>
                            <p className="lp-topic-teaching">{topic.teaching}</p>
                          </div>
                          
                          {/* Algorithm Steps Block */}
                          <div className="lp-algorithm-steps">
                            <strong className="lp-steps-title">Algorithm Procedure:</strong>
                            <div className="lp-code-block">
                              <pre>
                                <code>{topic.algorithmSteps}</code>
                              </pre>
                            </div>
                          </div>

                          {/* Task Assignment */}
                          <div className="lp-topic-task">
                            <strong className="lp-task-title">Your Mission:</strong>
                            <p className="lp-task-desc">{topic.task}</p>
                          </div>

                          {/* References Block */}
                          {topic.references && (
                            <div className="lp-references-section">
                              <strong className="lp-references-title">References:</strong>
                              <ul className="lp-references-list">
                                {topic.references.map((ref, idx) => (
                                  <li key={idx}>{ref}</li>
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