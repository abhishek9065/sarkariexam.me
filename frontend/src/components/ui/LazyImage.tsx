import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    fallback?: string;
    placeholder?: 'blur' | 'skeleton' | 'none';
}

/**
 * Lazy loading image component with intersection observer
 * - Only loads image when it enters viewport
 * - Shows placeholder while loading
 * - Handles errors with fallback
 */
export function LazyImage({
    src,
    alt,
    fallback = '/placeholder.png',
    placeholder = 'skeleton',
    className = '',
    ...props
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' } // Start loading 100px before viewport
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    const placeholderClass = placeholder === 'skeleton' && !isLoaded
        ? 'lazy-image-skeleton'
        : '';

    return (
        <img
            ref={imgRef}
            src={isInView ? (hasError ? fallback : src) : undefined}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            decoding="async"
            className={`lazy-image ${placeholderClass} ${isLoaded ? 'loaded' : ''} ${className}`}
            {...props}
        />
    );
}

export default LazyImage;
