import { FormEvent, useState } from 'react';

interface AdminShellSearchProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function AdminShellSearch({
    onSearch,
    placeholder = 'Search listings, organizations, or IDs',
    disabled = false,
}: AdminShellSearchProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        onSearch(trimmed);
    };

    return (
        <form className="admin-shell-search" onSubmit={handleSubmit} role="search" aria-label="Admin quick search">
            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                aria-label="Search admin listings"
            />
            <button
                type="submit"
                className="admin-btn secondary small"
                disabled={disabled || query.trim().length === 0}
            >
                Search
            </button>
        </form>
    );
}

