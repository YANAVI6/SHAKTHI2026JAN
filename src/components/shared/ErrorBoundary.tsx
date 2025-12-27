import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorService } from '../../services/errorService';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Use centralized error service
        errorService.logError(error, { componentStack: errorInfo.componentStack || undefined });

        // Update state with error
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleHome = () => {
        this.handleReset();
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 rounded-full p-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                            Oops! Something went wrong
                        </h1>

                        {/* Message */}
                        <p className="text-gray-600 text-center mb-6">
                            We encountered an unexpected error. Please try again or go back to the home page.
                        </p>

                        {/* Dev Error Details */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-gray-100 rounded p-4 mb-6 max-h-40 overflow-auto border border-gray-300">
                                <p className="text-sm font-mono text-gray-700 mb-2 break-words">
                                    <strong>Error:</strong> {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-xs text-gray-600">
                                        <summary className="cursor-pointer font-semibold mb-2">
                                            Stack trace (click to expand)
                                        </summary>
                                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs overflow-auto max-h-32">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 flex-col sm:flex-row">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleHome}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>

                        {/* Error ID */}
                        <p className="text-xs text-gray-500 text-center mt-6">
                            Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
