import { useState } from "react";
import "../styles/BigOModal.css";

const BIG_O_DATA = [
    { 
        complexity: "O(1)", 
        name: "Constant Time", 
        color: "excel",
        def: "The execution time remains exactly the same regardless of the size of the input data set. This is the most efficient complexity.",
        example: "Accessing a specific index in an array, pushing/popping a value to a stack, or inserting a key into a hash map."
    },
    { 
        complexity: "O(log n)", 
        name: "Logarithmic Time", 
        color: "excel",
        def: "The execution time grows logarithmically. The algorithm systematically divides the data set in half with each step. Highly efficient for large datasets.",
        example: "Binary Search on a sorted array."
    },
    { 
        complexity: "O(n)", 
        name: "Linear Time", 
        color: "good",
        def: "The execution time grows directly and proportionally with the size of the input data set. If you have 10 items, it takes 10 operations.",
        example: "Linear Search, traversing an array to find a maximum value."
    },
    { 
        complexity: "O(n log n)", 
        name: "Linearithmic Time", 
        color: "fair",
        def: "A combination of linear and logarithmic complexity. It performs an O(log n) operation for each item in the data set. Standard for efficient general-purpose sorting.",
        example: "Merge Sort, Quick Sort, and Heap Sort."
    },
    { 
        complexity: "O(n²)", 
        name: "Quadratic Time", 
        color: "bad",
        def: "The execution time grows proportionally to the square of the input size. Typically involves nested iterations over the data set. Not recommended for large inputs.",
        example: "Bubble Sort, Insertion Sort, Selection Sort."
    },
    { 
        complexity: "O(2ⁿ)", 
        name: "Exponential Time", 
        color: "bad",
        def: "The execution time doubles with each new element added to the input. Extremely inefficient and grows astronomically fast.",
        example: "Naive recursive calculation of Fibonacci numbers."
    },
    { 
        complexity: "O(n!)", 
        name: "Factorial Time", 
        color: "bad",
        def: "The execution time grows factorially based on the input size. This is the slowest common complexity. Even with small inputs, it takes a massive amount of time.",
        example: "Generating all possible permutations of a given string or array."
    }
    ];

    export default function BigOModal({ isOpen, onClose }) {
    const [expandedRow, setExpandedRow] = useState(null);

    if (!isOpen) return null;

    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    return (
        <div className="big-o-modal-overlay" onClick={onClose}>
        <div className="big-o-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="big-o-modal-header">
            <h2>📊 Big O Complexity Reference</h2>
            <button className="big-o-close-btn" onClick={onClose}>✕</button>
            </div>
            
            <div className="big-o-accordion">
            <div className="big-o-list-header">
                <span>Complexity</span>
                <span>Name</span>
                <span></span>
            </div>

            {BIG_O_DATA.map((item, idx) => (
                <div key={idx} className={`big-o-row ${expandedRow === idx ? 'expanded' : ''}`}>
                <div className="big-o-row-trigger" onClick={() => toggleRow(idx)}>
                    <span className={`o-badge o-${item.color}`}>{item.complexity}</span>
                    <span className="o-name">{item.name}</span>
                    <span className="o-chevron">{expandedRow === idx ? '▼' : '▶'}</span>
                </div>
                
                {expandedRow === idx && (
                    <div className="big-o-row-details">
                    <p><strong>Definition:</strong> {item.def}</p>
                    <p><strong>Common Examples:</strong> {item.example}</p>
                    </div>
                )}
                </div>
            ))}
            </div>
        </div>
        </div>
    );
}