import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-notion-bg-light dark:bg-notion-bg-dark transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md p-8 m-4 bg-white dark:bg-notion-bg-sidebarDark border border-notion-border-light dark:border-notion-border-dark rounded-xl shadow-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="text-3xl mb-2">💼</div>
          <h2 className="text-2xl font-bold tracking-tight text-notion-text-light dark:text-notion-text-dark">
            Log in to Collaborative Workspace
          </h2>
          <p className="text-sm text-notion-text-mutedLight dark:text-notion-text-mutedDark mt-1">
            Welcome back! Please enter your details below.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 mb-6 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-notion-text-mutedLight dark:text-notion-text-mutedDark">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-notion-border-light dark:border-notion-border-dark bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-notion-text-mutedLight dark:text-notion-text-mutedDark uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-notion-text-mutedLight dark:text-notion-text-mutedDark">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-notion-border-light dark:border-notion-border-dark bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark font-medium rounded-lg hover:opacity-90 transition-opacity text-sm mt-6"
          >
            <LogIn className="w-4 h-4" />
            Continue
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-notion-text-mutedLight dark:text-notion-text-mutedDark">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-blue-500 hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
