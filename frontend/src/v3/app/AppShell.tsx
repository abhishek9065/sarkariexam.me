import type { ReactNode } from 'react';
import { AppNav } from './AppNav';
import { AppFooter } from './AppFooter';
import { SearchOverlayV3 } from '../components/search/SearchOverlayV3';
import type { UseGlobalSearchV3Result } from '../hooks/useGlobalSearchV3';
import '../design/tokens.css';
import '../design/layout.css';

interface AppShellProps {
    children: ReactNode;
    search: UseGlobalSearchV3Result;
    compareCount?: number;
    onOpenCompare?: () => void;
}

export function AppShell({ children, search, compareCount = 0, onOpenCompare }: AppShellProps) {
    return (
        <div className="sr3-app">
            <a className="sr3-skip-link" href="#sr3-main">Skip to main content</a>
            <AppNav
                onOpenSearch={search.openSearch}
                compareCount={compareCount}
                onOpenCompare={onOpenCompare}
            />
            <main id="sr3-main" className="sr3-main">
                <div className="sr3-shell">{children}</div>
            </main>
            <AppFooter />
            <SearchOverlayV3 search={search} />
        </div>
    );
}

export default AppShell;
