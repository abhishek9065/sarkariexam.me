import { OpsBadge } from '../components/ops';
import { ModuleScaffold, PermissionState } from '../components/workspace';

interface ModuleProps {
    title: string;
    description: string;
}

export function ModulePlaceholder({ title, description }: ModuleProps) {
    return (
        <ModuleScaffold
            eyebrow="Module Gate"
            title={title}
            description={description}
            meta={(
                <>
                    <span className="workspace-meta-pill">Safe by default</span>
                    <span className="workspace-meta-pill">Route preserved</span>
                </>
            )}
            headerActions={<OpsBadge tone="warning">Disabled by configuration</OpsBadge>}
        >
            <PermissionState
                title="This workspace is currently disabled."
                description="The route is still reserved in admin-vNext, but the feature flag keeps the module isolated until it is explicitly enabled."
                detail={(
                    <>
                        This module can be enabled safely through <code>VITE_ADMIN_VNEXT_MODULES</code> without changing
                        route compatibility or shell navigation behavior.
                    </>
                )}
            />
        </ModuleScaffold>
    );
}
