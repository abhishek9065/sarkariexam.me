import { Link, useLocation } from 'react-router-dom';
import { adminModuleNavItems, getModuleByPath, groupedModuleLabels } from '../../config/adminModules';

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

    /* Hide the group segment when it is redundant with the module label.
       This covers single-item groups like Links/Link Manager and Media / PDFs. */
    const groupItemCount = adminModuleNavItems.filter((item) => item.group === mod.group).length;
    const isGroupRedundant =
        mod.group === 'dashboard'
        || groupItemCount === 1
        || groupLabel === mod.label
        || mod.label.toLowerCase().includes(groupLabel.toLowerCase());

    return (
        <nav className="ops-breadcrumb" aria-label="Breadcrumb">
            <ol>
                <li>
                    <Link to="/dashboard">Home</Link>
                </li>
                {!isGroupRedundant && (
                    <li>
                        <span>{groupLabel}</span>
                    </li>
                )}
                <li className="ops-breadcrumb-current">{mod.label}</li>
            </ol>
        </nav>
    );
}
