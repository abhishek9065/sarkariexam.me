import { Link, useLocation } from 'react-router-dom';
import { getModuleByPath, groupedModuleLabels } from '../../config/adminModules';

export function OpsBreadcrumb() {
    const { pathname } = useLocation();
    const mod = getModuleByPath(pathname);

    if (!mod) {
        return (
            <nav className="ops-breadcrumb" aria-label="Breadcrumb">
                <ol>
                    <li className="ops-breadcrumb-current">Dashboard</li>
                </ol>
            </nav>
        );
    }

    const groupLabel = groupedModuleLabels[mod.group];

    return (
        <nav className="ops-breadcrumb" aria-label="Breadcrumb">
            <ol>
                <li>
                    <Link to="/dashboard">Home</Link>
                </li>
                {mod.group !== 'dashboard' && (
                    <li>
                        <span>{groupLabel}</span>
                    </li>
                )}
                <li className="ops-breadcrumb-current">{mod.label}</li>
            </ol>
        </nav>
    );
}
