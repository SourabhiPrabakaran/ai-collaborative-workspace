import React, { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Error Boundary] Captured render crash:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark px-4">
          <div className="max-w-md w-full p-8 bg-white dark:bg-notion-bg-sidebarDark rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center text-red-500 mb-4">
              <AlertOctagon className="w-6 h-6" />
            </div>
            
            <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-notion-text-mutedLight dark:text-notion-text-mutedDark mb-6">
              {this.state.error?.message || 'An unexpected rendering error occurred inside the workspace.'}
            </p>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-notion-text-light dark:bg-notion-text-dark text-white dark:text-notion-bg-dark rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
