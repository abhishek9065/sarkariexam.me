import { useState } from 'react';

interface ShareButtonsProps {
    title: string;
    url?: string;
    description?: string;
}

export function ShareButtons({ title, url, description }: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = url || window.location.href;
    const shareText = `${title}${description ? ` - ${description}` : ''}`;

    const shareWhatsApp = () => {
        window.open(
            `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
            '_blank'
        );
    };

    const shareTelegram = () => {
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            '_blank'
        );
    };

    const shareTwitter = () => {
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            '_blank'
        );
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: description,
                    url: shareUrl,
                });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        }
    };

    return (
        <div className="share-buttons">
            <button className="share-btn whatsapp" onClick={shareWhatsApp} title="Share on WhatsApp">
                📱 WhatsApp
            </button>
            <button className="share-btn telegram" onClick={shareTelegram} title="Share on Telegram">
                ✈️ Telegram
            </button>
            <button className="share-btn twitter" onClick={shareTwitter} title="Share on Twitter">
                🐦 Twitter
            </button>
            <button className="share-btn copy" onClick={copyLink} title="Copy Link">
                {copied ? '✅ Copied!' : '🔗 Copy Link'}
            </button>
            {typeof navigator.share === 'function' && (
                <button className="share-btn native" onClick={nativeShare} title="Share">
                    📤 Share
                </button>
            )}
        </div>
    );
}

export default ShareButtons;
