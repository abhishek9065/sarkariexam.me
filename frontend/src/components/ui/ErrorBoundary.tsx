import React from 'react';
import { ErrorState } from './UXComponents';
import { captureError, reportIssue } from '../../utils/errorMonitoring';

interface ErrorBoundaryState {
    hasError: boolean;
    message?: string;
    errorId?: string;
    stack?: string;
    componentStack?: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        const errorId = this.state.errorId ?? this.createErrorId();
        if (!this.state.errorId) {
            this.setState({ errorId });
        }
        if (!this.state.stack || !this.state.componentStack) {
            this.setState({ stack: error.stack, componentStack: info.componentStack });
        }
        console.error('[ErrorBoundary]', errorId, error, info);
        captureError(error, { componentStack: info.componentStack }, errorId);
    }

    handleRetry = () => {
        this.setState({ hasError: false, message: undefined, errorId: undefined, stack: undefined, componentStack: undefined });
    };

    private createErrorId() {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    handleReport = async () => {
        if (!this.state.errorId) return;
        const note = window.prompt('What were you doing when this error happened? (Optional)');
        await reportIssue({
            errorId: this.state.errorId,
            message: this.state.message || 'Unknown error',
            note: note?.trim() || undefined,
            stack: this.state.stack,
            componentStack: this.state.componentStack,
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="app">
                    <main className="main-content">
                        <ErrorState
                            message={this.state.message || 'An unexpected error occurred.'}
                            onRetry={this.handleRetry}
                            errorId={this.state.errorId}
                            onReport={this.handleReport}
                        />
                    </main>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
