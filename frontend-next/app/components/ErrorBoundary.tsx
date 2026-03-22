'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '@/app/lib/reportClientError';

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

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Report to backend
        reportClientError({
            errorId: 'react_error_boundary',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack || undefined,
            note: 'Caught by React Error Boundary',
        }).catch(err => {
            console.error('Failed to report error:', err);
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary-fallback">
                    <div className="error-boundary-content">
                        <h2>Something went wrong</h2>
                        <p>We're sorry for the inconvenience. The error has been reported to our team.</p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="error-boundary-button"
                        >
                            Reload Page
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-boundary-details">
                                <summary>Error Details (Development Only)</summary>
                                <pre>{this.state.error.stack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
