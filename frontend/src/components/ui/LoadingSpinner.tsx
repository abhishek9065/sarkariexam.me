import './LoadingSpinner.css';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    text?: string;
}

export function LoadingSpinner({ size = 'medium', text }: LoadingSpinnerProps) {
    return (
        <div className={`loading-spinner ${size}`}>
            <div className="spinner" />
            {text && <p className="loading-text">{text}</p>}
        </div>
    );
}