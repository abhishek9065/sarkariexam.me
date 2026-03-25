'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { reportClientError } from '@/app/lib/reportClientError';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Report error to backend
        reportClientError({
            errorId: 'page_error',
            message: error.message,
            stack: error.stack,
            note: error.digest ? `Digest: ${error.digest}` : undefined,
        }).catch(err => {
            console.error('Failed to report error:', err);
        });
    }, [error]);

    return (
        <div className="error-page">
            <div className="error-content">
                <h2>Something went wrong!</h2>
                <p>We apologize for the inconvenience. Our team has been notified.</p>
                <button type="button" onClick={() => reset()} className="error-button">
                    Try again
                </button>
                <Link href="/" className="error-link">
                    Return to homepage
                </Link>
            </div>
        </div>
    );
}
