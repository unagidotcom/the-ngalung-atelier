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
      <rect width="100" height="100" rx="26" fill="#17181F" />
      <rect x="5" y="5" width="90" height="90" rx="22" fill="#20232C" />
      <rect x="9" y="9" width="82" height="82" rx="19" stroke="#E7DFCE" strokeWidth="1.5" strokeOpacity="0.22" />
      <path
        d="M26 31C34 23 45 19 57 21C68 23 76 30 80 40C72 36 64 34 56 35C45 36 35 42 28 52C25 46 24 38 26 31Z"
        fill="#FF5A36"
        fillOpacity="0.95"
      />
      <path
        d="M25 69C32 77 44 82 56 79C68 77 77 69 81 58C72 63 63 66 54 65C43 64 34 59 27 50C24 56 23 64 25 69Z"
        fill="#D8CDB4"
        fillOpacity="0.95"
      />

      <text
        x="50"
        y="66"
        textAnchor="middle"
        fill="#FAF6EE"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="54"
        fontStyle="italic"
        fontWeight="700"
      >
        N
      </text>
      <rect x="31" y="73" width="38" height="4.5" rx="2.25" fill="#FAF6EE" fillOpacity="0.88" />
    </svg>
  );
};

export default LogoMark;
