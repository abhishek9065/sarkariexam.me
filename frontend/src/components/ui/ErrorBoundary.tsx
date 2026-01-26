import React from 'react';
import { ErrorState } from './UXComponents';

interface ErrorBoundaryState {
    hasError: boolean;
    message?: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, message: undefined });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="app">
                    <main className="main-content">
                        <ErrorState
                            message={this.state.message || 'An unexpected error occurred.'}
                            onRetry={this.handleRetry}
                        />
                    </main>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
