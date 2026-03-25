import { useCallback } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type NavigateTo = string;

export function useNavigate(): (to: NavigateTo) => void {
    return useCallback((to: NavigateTo) => {
        if (typeof window === 'undefined') return;
        window.location.assign(to);
    }, []);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    to: NavigateTo;
    children?: ReactNode;
};

export function Link({ to, onClick, children, ...rest }: LinkProps) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
    };

    return (
        <a href={to} onClick={handleClick} {...rest}>
            {children}
        </a>
    );
}
