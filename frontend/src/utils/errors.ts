type ErrorPayload = {
    error?: unknown;
    message?: unknown;
    details?: unknown;
};

const cleanText = (value: string): string => value.trim();

const joinParts = (parts: string[]): string => {
    const cleaned = parts.map(cleanText).filter(Boolean);
    if (cleaned.length === 0) return '';
    if (cleaned.length === 1) return cleaned[0];
    return `${cleaned[0]}. ${cleaned.slice(1).join(' ')}`;
};

export function getApiErrorMessage(payload: unknown, fallback: string): string {
    if (!payload) return fallback;
    const data = payload as ErrorPayload;

    const errorText = typeof data.error === 'string' ? data.error : '';
    const messageText = typeof data.message === 'string' ? data.message : '';

    const combined = joinParts([errorText, messageText].filter(Boolean));
    if (combined) return combined;

    if (data.error && typeof data.error === 'object') {
        const errorObj = data.error as {
            formErrors?: string[];
            fieldErrors?: Record<string, string[]>;
        };
        const formErrors = Array.isArray(errorObj.formErrors)
            ? errorObj.formErrors.filter(Boolean)
            : [];
        const fieldErrors = errorObj.fieldErrors && typeof errorObj.fieldErrors === 'object'
            ? Object.values(errorObj.fieldErrors).flat().filter(Boolean)
            : [];
        const derived = joinParts([...formErrors, ...fieldErrors].filter(Boolean));
        if (derived) return derived;
    }

    if (data.details && typeof data.details === 'object') {
        const detailValues = Object.values(data.details as Record<string, unknown>)
            .flatMap((value) => {
                if (Array.isArray(value)) return value;
                return [value];
            })
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        const derived = joinParts(detailValues);
        if (derived) return derived;
    }

    return fallback;
}
