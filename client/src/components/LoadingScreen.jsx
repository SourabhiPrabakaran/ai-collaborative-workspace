import React from 'react';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-notion-bg-light dark:bg-notion-bg-dark transition-colors duration-200">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="w-12 h-12 border-4 border-notion-text-light/10 dark:border-notion-text-dark/10 rounded-full"></div>
        {/* Inner Spinning Ring */}
        <div className="absolute w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-sm font-medium text-notion-text-mutedLight dark:text-notion-text-mutedDark animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default LoadingScreen;
