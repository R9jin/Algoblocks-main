import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/LearningPath.css";

const LESSONS = [
  {
    id: "l1",
    number: "LESSON 1",
    title: "Linear Search",
    topics: [
      {
        id: "l1-t1",
        number: "TOPIC 1",
        title: "Introduction to Linear Search",
        level: "beginner",
        description: "Learn the simplest search algorithm",
        task: "Build a Linear Search using blocks: 1. Use a Loop to iterate the array 2. Use Compare to check each element 3. Use Return when found 4. Use Return -1 at the end",
        testCases: 3,
        templatePath: "search/linear_search"
      }
    ]
  },
  {
    id: "l2",
    number: "LESSON 2",
    title: "Bubble Sort",
    topics: [
      {
        id: "l2-t1",
        number: "TOPIC 1",
        title: "Bubble Sort Basics",
        level: "beginner",
        description: "Understand how to swap adjacent elements.",
        task: "Build a Bubble Sort using nested loops and an if-condition to swap elements that are out of order.",
        testCases: 4,
        templatePath: "sort/bubble_sort"
      }
    ]
  },
  {
    id: "l3",
    number: "LESSON 3",
    title: "Selection Sort",
    topics: [
      {
        id: "l3-t1",
        number: "TOPIC 1",
        title: "Selection Sort Strategy",
        level: "beginner",
        description: "Find the minimum element and place it at the beginning.",
        task: "Implement Selection Sort by tracking the minimum index in the unsorted portion of the array.",
        testCases: 3,
        templatePath: "sort/selection_sort"
      }
    ]
  },
  {
    id: "l4",
    number: "LESSON 4",
    title: "Insertion Sort",
    topics: [
      {
        id: "l4-t1",
        number: "TOPIC 1",
        title: "Insertion Sort Technique",
        level: "beginner",
        description: "Build a sorted array one element at a time.",
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
      {/* Header */}
      <header className="lp-header">
        <div className="lp-header-left">
          <div className="lp-logo">
            <img src="/assets/algoblocks_logo.png" alt="Logo" />
            <h1 style={{ color: '#3C2D76' }}>ALGOBLOCKS</h1>
          </div>
          <Link to="/dashboard" className="lp-back-link">&gt; Back to Dashboard</Link>
        </div>
        <div className="lp-header-right">
          <div className="lp-user-icon">
            <img src="/assets/user-icon.png" alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lp-main">
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
                          <span className="lp-topic-arrow">{isExpanded ? "v" : ">"}</span>
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
                              📋 {topic.testCases} test cases
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