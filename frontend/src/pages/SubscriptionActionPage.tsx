import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { ApiRequestError, unsubscribeSubscriptionToken, verifySubscriptionToken } from '../utils/api';

type SubscriptionActionMode = 'verify' | 'unsubscribe';

const ACTION_CONTENT: Record<
    SubscriptionActionMode,
    {
        icon: string;
        loadingTitle: string;
        loadingCopy: string;
        successTitle: string;
        successCopy: string;
        errorTitle: string;
        errorCopy: string;
    }
> = {
    verify: {
        icon: '📧',
        loadingTitle: 'Verifying your email',
        loadingCopy: 'Please wait while we confirm your subscription.',
        successTitle: 'Email verified',
        successCopy: 'Your SarkariExams subscription is now active. You will receive updates based on your selected categories.',
        errorTitle: 'Verification failed',
        errorCopy: 'This verification link is missing, invalid, or has already expired.',
    },
    unsubscribe: {
        icon: '🔕',
        loadingTitle: 'Updating your subscription',
        loadingCopy: 'Please wait while we process your unsubscribe request.',
        successTitle: 'You are unsubscribed',
        successCopy: 'You will no longer receive subscription emails from SarkariExams for this address.',
        errorTitle: 'Unable to unsubscribe',
        errorCopy: 'This unsubscribe link is missing, invalid, or has already been used.',
    },
};

function extractToken(searchParams: URLSearchParams): string {
    const searchToken = searchParams.get('token')?.trim();
    if (searchToken) {
        return searchToken;
    }

    if (typeof window === 'undefined') {
        return '';
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hashParams.get('token')?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiRequestError) {
        const body = error.body as Record<string, unknown> | null;
        if (body && typeof body.error === 'string' && body.error.trim()) {
            return body.error;
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

export function SubscriptionActionPage({ mode }: { mode: SubscriptionActionMode }) {
    const [searchParams] = useSearchParams();
    const token = extractToken(searchParams);
    const content = ACTION_CONTENT[mode];

    const query = useQuery({
        queryKey: ['subscription-action', mode, token],
        queryFn: () => (
            mode === 'verify'
                ? verifySubscriptionToken(token)
                : unsubscribeSubscriptionToken(token)
        ),
        enabled: token.length > 0,
        retry: false,
        staleTime: Infinity,
    });

    const isMissingToken = token.length === 0;
    const heading = isMissingToken
        ? content.errorTitle
        : query.isPending
            ? content.loadingTitle
            : query.isError
                ? content.errorTitle
                : content.successTitle;
    const message = isMissingToken
        ? content.errorCopy
        : query.isPending
            ? content.loadingCopy
            : query.isError
                ? getErrorMessage(query.error, content.errorCopy)
                : query.data?.message || content.successCopy;

    return (
        <Layout>
            <article className="static-page animate-fade-in">
                <div className="static-header">
                    <span className="static-icon">{content.icon}</span>
                    <div>
                        <h1>{heading}</h1>
                        <p className="text-muted">Subscription center</p>
                    </div>
                </div>

                <div className="static-content">
                    <section className="card" style={{ padding: 24 }}>
                        <p className="text-muted" style={{ marginBottom: 16 }}>
                            {message}
                        </p>

                        {query.isPending ? (
                            <p className="text-muted" style={{ margin: 0 }}>
                                Processing your request securely.
                            </p>
                        ) : null}

                        <div className="not-found-actions" style={{ justifyContent: 'flex-start', marginTop: 24 }}>
                            <Link to="/" className="btn btn-accent">Go Home</Link>
                            <Link to="/jobs" className="btn btn-outline">Browse Jobs</Link>
                            <Link to="/contact" className="btn btn-outline">Contact Support</Link>
                        </div>
                    </section>
                </div>
            </article>
        </Layout>
    );
}
