import { useState, useEffect } from 'react';

// Toast notification component
interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

// Scroll to top button
export function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            className={`scroll-to-top ${visible ? 'visible' : ''}`}
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            ↑
        </button>
    );
}

// Loading spinner
export function LoadingSpinner() {
    return <div className="loading-spinner" />;
}

// Progress bar
export function ProgressBar({ progress }: { progress: number }) {
    return (
        <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
    );
}

// Page transition wrapper
export function PageTransition({ children }: { children: React.ReactNode }) {
    return <div className="page-transition">{children}</div>;
}

// Animated counter for numbers
export function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            setDisplayValue(Math.floor(progress * value));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span>{displayValue.toLocaleString()}</span>;
}

// Skeleton loader with shimmer
export function Skeleton({ width = '100%', height = '20px', rounded = false }) {
    return (
        <div
            className="skeleton-shimmer"
            style={{
                width,
                height,
                borderRadius: rounded ? '50%' : '4px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeletonShimmer 1.5s infinite'
            }}
        />
    );
}

// Tooltip component
export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
    return (
        <div className="tooltip-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            {children}
            <span className="tooltip-text" style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#333',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                opacity: 0,
                visibility: 'hidden',
                transition: 'all 0.2s ease',
                zIndex: 1000,
                marginBottom: '8px'
            }}>
                {text}
            </span>
        </div>
    );
}
