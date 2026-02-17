import type { ReactNode } from 'react';

type Column = {
    key: string;
    label: string;
};

type OpsTableProps = {
    columns: Column[];
    children: ReactNode;
};

export function OpsTable({ columns, children }: OpsTableProps) {
    return (
        <div className="ops-table-wrap">
            <table className="ops-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}
