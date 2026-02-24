import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportClientError } from '../utils/reportClientError';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
        void reportClientError({
            errorId: 'frontend_error_boundary',
            message: error.message || 'Unhandled UI error',
            note: 'React ErrorBoundary captured an exception.',
            stack: error.stack,
            componentStack: info.componentStack || undefined,
            dedupeKey: `error_boundary:${error.name}:${error.message}`,
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <span className="error-boundary-icon">⚠️</span>
                        <h2>Something went wrong</h2>
                        <p className="text-muted">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
