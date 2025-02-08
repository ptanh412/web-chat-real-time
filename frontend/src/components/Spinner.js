import React from "react";

export const SpinnerOverlay = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dark:bg-white/10">
      <Spinner size="large" />
    </div>
  );
};

export const Spinner = ({
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <svg 
        className={`block ${sizeClasses[size]}`}
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pl-grad1" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor="rgb(236, 72, 153)" />
            <stop offset="100%" stopColor="rgb(37, 99, 235)" />
          </linearGradient>
          <linearGradient id="pl-grad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(236, 72, 153)" />
            <stop offset="100%" stopColor="rgb(37, 99, 235)" />
          </linearGradient>
        </defs>
        <circle 
          className="animate-spinner-ring"
          cx="100" 
          cy="100" 
          r="82" 
          fill="none" 
          stroke="url(#pl-grad1)" 
          strokeWidth="36" 
          strokeDasharray="0 257 1 257" 
          strokeDashoffset="0.01" 
          strokeLinecap="round" 
          transform="rotate(-90,100,100)" 
        />
        <line 
          className="animate-spinner-ball"
          stroke="url(#pl-grad2)" 
          x1="100" 
          y1="18" 
          x2="100.01" 
          y2="182" 
          strokeWidth="36" 
          strokeDasharray="1 165" 
          strokeLinecap="round" 
        />
      </svg>
    </div>
  );
};

export default Spinner;