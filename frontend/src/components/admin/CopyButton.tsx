import { useState, useCallback } from 'react';
import './CopyButton.css';

interface CopyButtonProps {
    text: string;
    label?: string;
    className?: string;
}

export function CopyButton({ text, label, className = '' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [text]);

    return (
        <button
            className={`copy-btn ${copied ? 'copied' : ''} ${className}`}
            onClick={handleCopy}
            title={copied ? 'Copied!' : `Copy ${label || 'to clipboard'}`}
            type="button"
        >
            {copied ? '✓' : '📋'}
            {label && <span className="copy-label">{label}</span>}
        </button>
    );
}

export default CopyButton;
