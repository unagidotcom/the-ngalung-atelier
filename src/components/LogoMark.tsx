import React from 'react';

interface LogoMarkProps {
  className?: string;
  size?: number | string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ className = 'w-8 h-8', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      style={style}
      aria-label="The Ngalung Atelier Logo"
    >
      {/* Ink Navy Rounded-Square Badge */}
      <rect width="100" height="100" rx="22" fill="#17181F" />
      
      {/* Inner subtle craft border */}
      <rect x="3" y="3" width="94" height="94" rx="19" stroke="#31333F" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* Italic Serif 'N' in Warm Paper-White */}
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fill="#FAF6EE"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="58"
        fontStyle="italic"
        fontWeight="700"
      >
        N
      </text>

      {/* Coral Underline Accent Stroke */}
      <rect x="32" y="74" width="36" height="5.5" rx="2.75" fill="#FF5A36" />
    </svg>
  );
};

export default LogoMark;
