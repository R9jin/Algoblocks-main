import { useMemo } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

// Mathematical curves for the different Big-O notation types
const generateGraphData = (complexity) => {
  const data = [];
  
  for (let n = 1; n <= 10; n++) {
    let yValue = 0;
    
    if (complexity.includes("O(1)")) {
      yValue = 1;
    } else if (complexity.includes("O(log n)")) {
      yValue = Math.log2(n + 1); // +1 to avoid dropping to 0
    } else if (complexity.includes("O(n^2)")) {
      yValue = Math.pow(n, 2);
    } else if (complexity.includes("O(n log n)")) {
      yValue = n * Math.log2(n + 1);
    } else if (complexity.includes("O(2^n)")) {
      yValue = Math.pow(2, n);
    } else if (complexity.includes("O(n!)")) {
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;
      yValue = fact;
    } else {
      // Default to O(n) for "O(n)", "T(n)", or fallback
      yValue = n; 
    }

    data.push({ 
      n: n, 
      operations: parseFloat(yValue.toFixed(2)) 
    });
  }
  return data;
};

const ComplexityGraph = ({ complexity, color = "#e67e22" }) => {
  const data = useMemo(() => generateGraphData(complexity), [complexity]);

  // Don't render a graph for empty, dead code, or definitions
  if (!complexity || complexity === "-" || complexity.includes("Dead Code") || complexity === "Definition") {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '180px', marginTop: '15px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
          
          <XAxis 
            dataKey="n" 
            tick={{ fontSize: 12, fill: '#666' }} 
            tickFormatter={(val) => `n=${val}`} 
            axisLine={false}
            tickLine={false}
          />
          
          <YAxis 
            tick={{ fontSize: 12, fill: '#666' }} 
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip 
            formatter={(value) => [value, 'Operations']}
            labelFormatter={(label) => `Input Size (n): ${label}`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          
          <Line 
            type="monotone" 
            dataKey="operations" 
            stroke={color} 
            strokeWidth={3}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComplexityGraph;