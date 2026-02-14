import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnnouncementCard } from '../../types';
import { buildAnnouncementDetailPath, type SourceTag } from '../../utils/trackingLinks';

type MobileTabKey = 'result' | 'admit-card' | 'job';

interface MobileMajorTabConfig {
    key: MobileTabKey;
    title: string;
    viewMoreTo: string;
    sourceTag: SourceTag;
    items: AnnouncementCard[];
}

interface HomeMobileTabsProps {
    tabs: MobileMajorTabConfig[];
}

export function HomeMobileTabs({ tabs }: HomeMobileTabsProps) {
    const [activeTab, setActiveTab] = useState<MobileTabKey>(tabs[0]?.key ?? 'result');

    const active = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [tabs, activeTab]);
    if (!active) return null;

    const panelId = `home-mobile-panel-${active.key}`;
    const tabId = `home-mobile-tab-${active.key}`;

    return (
        <section className="home-mobile-tabs" data-testid="home-mobile-tabs">
            <div className="home-mobile-tabs-strip" role="tablist" aria-label="Homepage major sections">
                {tabs.map((tab) => {
                    const isActive = tab.key === active.key;
                    const currentTabId = `home-mobile-tab-${tab.key}`;
                    const currentPanelId = `home-mobile-panel-${tab.key}`;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            id={currentTabId}
                            className={`home-mobile-tab${isActive ? ' active' : ''}`}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={currentPanelId}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.title}
                        </button>
                    );
                })}
            </div>

            <div
                className="home-mobile-major-panel"
                id={panelId}
                role="tabpanel"
                aria-labelledby={tabId}
                data-testid="home-mobile-major-panel"
            >
                <h3 className="home-mobile-major-title" data-testid="home-mobile-major-title">{active.title}</h3>
                {active.items.length === 0 ? (
                    <p className="home-mobile-major-empty">No updates available.</p>
                ) : (
                    <ul className="home-mobile-major-list">
                        {active.items.map((item) => (
                            <li key={item.id}>
                                <Link
                                    to={buildAnnouncementDetailPath(item.type, item.slug, active.sourceTag)}
                                    className="home-mobile-major-link"
                                >
                                    {item.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                <Link to={active.viewMoreTo} className="home-mobile-major-view-more">View More</Link>
            </div>
        </section>
    );
}
