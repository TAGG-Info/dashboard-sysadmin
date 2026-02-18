'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = '#4ade80',
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  // Limit to 30 points max
  const trimmedData = data.slice(-30).map((value, index) => ({
    index,
    value,
  }));

  if (trimmedData.length === 0) {
    return (
      <div
        className={className}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trimmedData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
