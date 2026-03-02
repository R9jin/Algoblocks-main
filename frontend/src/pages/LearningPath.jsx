import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader"; // <-- 1. Import the header
import "../styles/LearningPath.css";

const LESSONS = [
  {
    id: "l0",
    number: "LESSON 1",
    title: "Introduction to Algorithms",
    topics: [
      {
        id: "l0-t1",
        number: "TOPIC 1",
        title: "What is an Algorithm?",
        level: "beginner",
        description: "An algorithm is simply a step-by-step set of instructions used to solve a specific problem or complete a task.",
        task: "Familiarize yourself with the visual blocks. Connect a simple sequence of Output blocks to print 'Hello' and 'World' to understand how instructions run in order.",
        testCases: 1,
        templatePath: "intro/what_is_algo"
      },
      {
        id: "l0-t2",
        number: "TOPIC 2",
        title: "Logic & Flow",
        level: "beginner",
        description: "Discover how algorithms make decisions using conditions and repeat actions using loops.",
        task: "Use an If-Else block to check a condition. If the condition is true, output 'Yes', otherwise output 'No'.",
        testCases: 2,
        templatePath: "intro/logic_flow"
      }
    ]
  },
  {
    id: "l1",
    number: "LESSON 2",
    title: "Linear Search",
    topics: [
      {
        id: "l1-t1",
        number: "TOPIC 1",
        title: "Introduction to Linear Search",
        level: "beginner",
        description: "Learn the simplest search algorithm. It checks every item in a list one by one until it finds the target.",
        task: "Build a Linear Search using blocks: 1. Use a Loop to iterate the array 2. Use Compare to check each element 3. Use Return when found 4. Use Return -1 at the end",
        testCases: 3,
        templatePath: "search/linear_search"
      }
    ]
  },
  {
    id: "l2",
    number: "LESSON 3",
    title: "Bubble Sort",
    topics: [
      {
        id: "l2-t1",
        number: "TOPIC 1",
        title: "Bubble Sort Basics",
        level: "beginner",
        description: "Understand how to sort a list by repeatedly swapping adjacent elements that are out of order.",
        task: "Build a Bubble Sort using nested loops and an if-condition to swap elements that are out of order.",
        testCases: 4,
        templatePath: "sort/bubble_sort"
      }
    ]
  },
  {
    id: "l3",
    number: "LESSON 4",
    title: "Selection Sort",
    topics: [
      {
        id: "l3-t1",
        number: "TOPIC 1",
        title: "Selection Sort Strategy",
        level: "beginner",
        description: "Find the minimum element from the unsorted portion and place it at the beginning.",
        task: "Implement Selection Sort by tracking the minimum index in the unsorted portion of the array.",
        testCases: 3,
        templatePath: "sort/selection_sort"
      }
    ]
  },
  {
    id: "l4",
    number: "LESSON 5",
    title: "Insertion Sort",
    topics: [
      {
        id: "l4-t1",
        number: "TOPIC 1",
        title: "Insertion Sort Technique",
        level: "beginner",
        description: "Build a sorted array one element at a time, just like sorting playing cards in your hands.",
        task: "Use a while loop to shift elements to the right to make room for the current item being sorted.",
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
      {/* 2. Replaced the manual header with your reusable component */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="lp-main">
        {/* 3. Moved the 'Back' link here so you don't lose it */}
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