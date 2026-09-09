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
      <rect width="100" height="100" rx="24" fill="#11151D" />
      <rect x="7" y="7" width="86" height="86" rx="20" fill="#FAF6EE" />
      <rect x="12" y="12" width="76" height="76" rx="17" fill="#17181F" />
      <path d="M28 71V29H36L64 58V29H72V71H64L36 42V71H28Z" fill="#FAF6EE" />
      <path d="M30 76H70" stroke="#FF5A36" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 25C62 21 51 20 41 23" stroke="#D8CDB4" strokeWidth="4" strokeLinecap="round" />
      <circle cx="73" cy="27" r="4" fill="#FF5A36" />
    </svg>
  );
};

export default LogoMark;
