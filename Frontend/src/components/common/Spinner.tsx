import React from 'react';

interface SpinnerProps {
  size?: number;
  color?: string;
  shadowColor?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 16,
  color = '#FFF',
  shadowColor = 'var(--tw-color-green-pale)',
}) => {
  return (
    <span
      className="loader"
      style={
        {
          '--size': `${size}px`,
          '--color': color,
          '--shadow-color': shadowColor,
        } as React.CSSProperties
      }
    />
  );
};

export default Spinner;
