import type { HTMLAttributes, ReactNode } from 'react';

type ActionBarProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    className?: string;
};

export function ActionBar({ children, className = '', ...rest }: ActionBarProps) {
    return <div className={`workspace-action-bar${className ? ` ${className}` : ''}`} {...rest}>{children}</div>;
}
