import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, EyeOff } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark px-4 transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-8 text-center flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center text-blue-500 mb-6 animate-bounce">
          <EyeOff className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-semibold mb-2">Page not found</h2>
        <p className="text-sm text-notion-text-mutedLight dark:text-notion-text-mutedDark mb-8">
          The workspace, document, or route you are attempting to access does not exist or has been deleted.
        </p>

        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
