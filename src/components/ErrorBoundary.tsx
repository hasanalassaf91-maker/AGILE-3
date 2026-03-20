import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isFirestoreError = this.state.error?.message.includes('operationType');
      let displayMessage = this.state.error?.message;
      
      try {
        if (isFirestoreError && displayMessage) {
          const details = JSON.parse(displayMessage);
          displayMessage = `Firestore ${details.operationType} failed at "${details.path}": ${details.error}`;
        }
      } catch (e) {
        // Fallback to original message
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-gray-50">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-2xl w-full border border-gray-100">
            <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="serif text-3xl text-gray-900 mb-4">Application Error</h1>
            <p className="text-gray-600 mb-8">
              The application encountered an unexpected issue. We've logged the details for debugging.
            </p>
            
            <div className="p-6 bg-gray-900 rounded-2xl text-left mb-8 overflow-hidden">
              <p className="text-xs font-mono text-emerald-400 mb-2 uppercase tracking-widest opacity-50">Error Details</p>
              <pre className="text-xs font-mono text-white overflow-auto max-h-40 whitespace-pre-wrap">
                {displayMessage}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="rounded-full bg-gray-900 px-8 py-3 text-white font-bold text-sm transition-all hover:bg-gray-800"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-gray-200 bg-white px-8 py-3 text-gray-900 font-bold text-sm transition-all hover:bg-gray-50"
              >
                Try Refreshing
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { AlertCircle } from 'lucide-react';
