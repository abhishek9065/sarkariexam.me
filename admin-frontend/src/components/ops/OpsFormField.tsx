import type { ReactNode } from 'react';

type OpsFormFieldProps = {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    optional?: boolean;
    children: ReactNode;
};

export function OpsFormField({
    label,
    htmlFor,
    hint,
    error,
    optional = false,
    children,
}: OpsFormFieldProps) {
    return (
        <div className={`ops-form-field${error ? ' has-error' : ''}`}>
            <label className="ops-form-field-label" htmlFor={htmlFor}>
                {label}
                {optional && <span className="ops-form-field-optional">Optional</span>}
            </label>
            {children}
            {hint && !error && <span className="ops-form-field-hint">{hint}</span>}
            {error && <span className="ops-form-field-error">{error}</span>}
        </div>
    );
}
