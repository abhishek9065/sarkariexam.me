interface ModuleProps {
    title: string;
    description: string;
}

export function ModulePlaceholder({ title, description }: ModuleProps) {
    return (
        <div className="admin-card">
            <h2>{title}</h2>
            <p className="admin-muted">{description}</p>
            <p className="admin-muted">
                This module route is now isolated in admin-frontend and can be extended without impacting the public frontend app.
            </p>
        </div>
    );
}
