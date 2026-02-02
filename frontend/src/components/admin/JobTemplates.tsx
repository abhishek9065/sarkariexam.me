import { useState } from 'react';
import './JobTemplates.css';
import { JOB_TEMPLATES, type JobTemplate } from './JobTemplates.data';

interface JobTemplatesProps {
    onSelectTemplate: (template: JobTemplate) => void;
    disabled?: boolean;
}

export function JobTemplates({ onSelectTemplate, disabled }: JobTemplatesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTemplates = JOB_TEMPLATES.filter(
        (t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (template: JobTemplate) => {
        if (disabled) return;
        onSelectTemplate(template);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="job-templates">
            <button
                className="templates-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                type="button"
            >
                <span className="templates-icon">📄</span>
                <span>Use Template</span>
                <span className="templates-chevron">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="templates-dropdown">
                    <div className="templates-search">
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="templates-list">
                        {filteredTemplates.map((template) => (
                            <button
                                key={template.id}
                                className="template-item"
                                onClick={() => handleSelect(template)}
                                type="button"
                            >
                                <span className="template-icon">{template.icon}</span>
                                <div className="template-info">
                                    <div className="template-name">{template.name}</div>
                                    <div className="template-desc">{template.description}</div>
                                </div>
                            </button>
                        ))}
                        {filteredTemplates.length === 0 && (
                            <div className="templates-empty">No templates found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default JobTemplates;
