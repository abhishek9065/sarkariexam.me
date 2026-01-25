import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

// Breadcrumb navigation for better wayfinding
export function Breadcrumbs({ items }: BreadcrumbsProps) {
    const navigate = useNavigate();

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
                <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                        🏠 Home
                    </a>
                </li>
                {items.map((item, idx) => (
                    <li key={idx}>
                        <span className="separator">›</span>
                        {item.path ? (
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate(item.path!); }}>
                                {item.label}
                            </a>
                        ) : (
                            <span className="current">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// Quick Stats Cards for Home Page
interface StatCardProps {
    icon: string;
    value: number;
    label: string;
    color: string;
    onClick?: () => void;
}

export function StatCard({ icon, value, label, color, onClick }: StatCardProps) {
    const CardElement = onClick ? 'button' : 'div';
    
    return (
        <CardElement
            className={`stat-card ${color}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
            aria-label={onClick ? `View ${label.toLowerCase()}: ${value.toLocaleString()} items` : undefined}
        >
            <div className="stat-icon" aria-hidden="true">{icon}</div>
            <div className="stat-value" aria-label={`${value.toLocaleString()} ${label.toLowerCase()}`}>{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
            {onClick && <span className="stat-action" aria-hidden="true">→</span>}
        </CardElement>
    );
}

export function StatsSection({ stats, onCategoryClick }: { stats: { jobs: number; results: number; admitCards: number; total: number }; onCategoryClick?: (type: string) => void }) {
    return (
        <div className="stats-section" role="group" aria-label="Content statistics">
            <h3 className="stats-title">Current Content Overview</h3>
            <div className="stats-grid">
                <StatCard 
                    icon="💼" 
                    value={stats.jobs} 
                    label="Active Job Notifications" 
                    color="green" 
                    onClick={onCategoryClick ? () => onCategoryClick('job') : undefined}
                />
                <StatCard 
                    icon="📊" 
                    value={stats.results} 
                    label="Result Announcements" 
                    color="blue" 
                    onClick={onCategoryClick ? () => onCategoryClick('result') : undefined}
                />
                <StatCard 
                    icon="🎫" 
                    value={stats.admitCards} 
                    label="Admit Card Downloads" 
                    color="purple" 
                    onClick={onCategoryClick ? () => onCategoryClick('admit-card') : undefined}
                />
                <StatCard 
                    icon="📋" 
                    value={stats.total} 
                    label="Total Notifications" 
                    color="orange" 
                    onClick={() => onCategoryClick && onCategoryClick('all')}
                />
            </div>
            <p className="stats-note">Click any statistic to view that category</p>
        </div>
    );
}

// Empty State for when there's no data
interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            {action && (
                <button className="empty-action" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}

// Error State
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>{message}</p>
            {onRetry && (
                <button className="retry-btn" onClick={onRetry}>
                    🔄 Try Again
                </button>
            )}
        </div>
    );
}

// Filter Chips for Category Pages
interface FilterChip {
    label: string;
    value: string;
    count?: number;
}

interface FilterChipsProps {
    chips: FilterChip[];
    selected: string;
    onChange: (value: string) => void;
}

export function FilterChips({ chips, selected, onChange }: FilterChipsProps) {
    return (
        <div className="filter-chips">
            {chips.map(chip => (
                <button
                    key={chip.value}
                    className={`filter-chip ${selected === chip.value ? 'active' : ''}`}
                    onClick={() => onChange(chip.value)}
                >
                    {chip.label}
                    {chip.count !== undefined && <span className="chip-count">{chip.count}</span>}
                </button>
            ))}
        </div>
    );
}

// Sort Dropdown
interface SortOption {
    label: string;
    value: string;
}

export function SortDropdown({
    options,
    selected,
    onChange
}: {
    options: SortOption[];
    selected: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="sort-dropdown">
            <label>Sort by:</label>
            <select value={selected} onChange={(e) => onChange(e.target.value)}>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

// Pagination Component
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return (
        <div className="pagination">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                ‹ Prev
            </button>

            {start > 1 && (
                <>
                    <button onClick={() => onPageChange(1)}>1</button>
                    {start > 2 && <span className="ellipsis">...</span>}
                </>
            )}

            {pages.map(page => (
                <button
                    key={page}
                    className={page === currentPage ? 'active' : ''}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="ellipsis">...</span>}
                    <button onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                </>
            )}

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Next ›
            </button>
        </div>
    );
}

// Quick Actions Bar
export function QuickActions({ actions }: { actions: { icon: string; label: string; onClick: () => void }[] }) {
    return (
        <div className="quick-actions">
            {actions.map((action, idx) => (
                <button key={idx} className="quick-action" onClick={action.onClick}>
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                </button>
            ))}
        </div>
    );
}

// Search with results count
export function SearchBox({
    value,
    onChange,
    placeholder = 'Search...',
    resultCount
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    resultCount?: number;
}) {
    return (
        <div className="search-box">
            <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                {value && (
                    <button className="clear-btn" onClick={() => onChange('')}>✕</button>
                )}
            </div>
            {resultCount !== undefined && value && (
                <div className="result-count">
                    {resultCount} result{resultCount !== 1 ? 's' : ''} found
                </div>
            )}
        </div>
    );
}
