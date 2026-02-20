import { type ReactNode } from 'react';

interface DesktopOnlyGateProps {
    children: ReactNode;
}

export function DesktopOnlyGate({ children }: DesktopOnlyGateProps) {
    // The admin portal is now responsive and supports mobile devices.
    return <>{children}</>;
}
