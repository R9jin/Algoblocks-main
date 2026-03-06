import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import "../styles/LearningPath.css";

const LESSONS = [
{
  id: "l1",
  number: "LESSON 1",
  title: "Algorithm Foundations",
  topics: [

{
id: "l1-t1",
number: "TOPIC 1",
title: "Introduction to Algorithms",
level: "beginner",
description: "Understanding what algorithms are and why they are important in computer science.",
content: `
Introduction to Algorithms

An algorithm is a step-by-step procedure used to solve a problem or accomplish a specific task. In computer science, algorithms describe the sequence of operations that transform input into output.

Algorithms are the foundation of all software systems. Every program relies on algorithms to process data and produce results.

Characteristics of a Good Algorithm

1. Input – accepts zero or more inputs
2. Output – produces at least one output
3. Definiteness – steps are clear and unambiguous
4. Finiteness – the algorithm eventually stops
5. Effectiveness – steps can actually be executed

Example

Problem: Find the largest number in a list

Steps:
1. Assume the first number is the largest
2. Compare it with the next number
3. If the next number is larger, update the largest
4. Repeat until the list ends
5. Output the largest number
`,
task: "Identify the correct sequence of steps in a simple algorithm.",
testCases: 3,
templatePath: "intro/what_is_algo"
},

{
id: "l1-t2",
number: "TOPIC 2",
title: "Linear Search",
level: "beginner",
description: "A basic searching algorithm that checks elements sequentially.",
content: `
Linear Search

Linear Search examines each element of a list one by one until the desired value is found.

How it works

1. Start at the first element
2. Compare it with the target
3. If equal → return index
4. Otherwise move to the next element
5. Repeat until found or list ends

Example

Array: [4,7,2,9,5]
Target: 9

Compare 4 → no  
Compare 7 → no  
Compare 2 → no  
Compare 9 → found

Index = 3

Time Complexity

Best Case: O(1)
Worst Case: O(n)
`,
task: "Build a block algorithm that searches for a number in an array.",
testCases: 3,
templatePath: "search/linear_search"
},

{
id: "l1-t3",
number: "TOPIC 3",
title: "Binary Search",
level: "intermediate",
description: "An efficient searching algorithm that works on sorted arrays.",
content: `
Binary Search works by repeatedly dividing a sorted array in half.

Steps

1. Find the middle element
2. If target equals middle → found
3. If target < middle → search left half
4. If target > middle → search right half
5. Repeat

Time Complexity

Best Case: O(1)
Worst Case: O(log n)

Binary search is significantly faster than linear search for large datasets.
`,
task: "Complete the block sequence for binary search.",
testCases: 3,
templatePath: "search/binary_search"
}

]
},

{
id: "l2",
number: "LESSON 2",
title: "Sorting Algorithms",
topics: [

{
id: "l2-t1",
number: "TOPIC 1",
title: "Bubble Sort",
level: "beginner",
description: "A simple sorting algorithm that swaps adjacent elements.",
content: `
Bubble Sort repeatedly compares adjacent elements and swaps them if they are in the wrong order.

Example

[5,3,8,2]

Pass 1
5 3 swap
5 8 ok
8 2 swap

Result
[3,5,2,8]

Time Complexity

Worst Case: O(n²)
`,
task: "Create a bubble sort algorithm using block operations.",
testCases: 3,
templatePath: "sort/bubble_sort"
},

{
id: "l2-t2",
number: "TOPIC 2",
title: "Selection Sort",
level: "beginner",
description: "Repeatedly selects the smallest element.",
content: `
Selection Sort divides the list into sorted and unsorted sections.

Each step:
Find the smallest value
Swap it with the first unsorted position

Time Complexity

O(n²)
`,
task: "Arrange blocks to implement selection sort.",
testCases: 3,
templatePath: "sort/selection_sort"
},

{
id: "l2-t3",
number: "TOPIC 3",
title: "Insertion Sort",
level: "beginner",
description: "Builds the sorted list one element at a time.",
content: `
Insertion Sort works similar to sorting cards in your hand.

Each element is inserted into its correct position in the sorted portion.

Best Case: O(n)
Worst Case: O(n²)
`,
task: "Construct an insertion sort algorithm using blocks.",
testCases: 3,
templatePath: "sort/insertion_sort"
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

      {/* Main Content */}
      <main className="lp-main">
        <div style={{ marginBottom: "25px" }}>
          <Link to="/dashboard" className="lp-back-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polyline points="15 18 9 12 15 6"></polyline></svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="lp-hero">
          <div className="lp-hero-icon">
            <img src="/assets/learning-icon.png" alt="Learning" />
          </div>
          <div className="lp-hero-text">
            <h2>Learning Path</h2>
            <p>Master algorithms step-by-step</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="lp-info-box">
          Each topic has a built-in activity where you build the algorithm using visual blocks. Click on a topic to start.
        </div>

        {/* Lesson List */}
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

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="lp-topic-content">
                          <p className="lp-topic-desc">{topic.description}</p>
                          {topic.content && (
                          <div className="lp-topic-lesson">
                          <div className="lp-lesson-content">
                            {topic.content.split("\n").map((line, i) => {
                              if (line.trim().length === 0) return <br key={i} />

                              if (line.length < 40 && !line.includes(":") && !line.includes(".")) {
                                return <h4 key={i} className="lp-content-header">{line}</h4>
                              }

                              return <p key={i}>{line}</p>
                            })}
                          </div>
                        </div>
                      )}
                          <div className="lp-topic-task">
                            <strong>Task</strong>
                            <p>{topic.task}</p>
                          </div>
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