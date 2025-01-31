import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div 
      className="loader"
      style={{
        '--size': '8px',
        '--color': '#4f46e5',
        '--shadow-color': '#818cf8'
      } as React.CSSProperties}
    />
  );
};

export default LoadingSpinner; 