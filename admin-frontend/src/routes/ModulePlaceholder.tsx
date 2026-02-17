import { OpsCard } from '../components/ops';

interface ModuleProps {
    title: string;
    description: string;
}

export function ModulePlaceholder({ title, description }: ModuleProps) {
    return (
        <OpsCard title={title} description={description} tone="muted">
            <div className="admin-alert info">
                This module stays isolated in admin-frontend and can be enabled safely via VITE_ADMIN_VNEXT_MODULES.
            </div>
        </OpsCard>
    );
}
