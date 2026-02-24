type ErrorPayload = {
    error?: unknown;
    message?: unknown;
};

const cleanText = (value: string): string => value.trim();

const joinParts = (parts: string[]): string => {
    const cleaned = parts.map(cleanText).filter(Boolean);
    if (cleaned.length === 0) return '';
    if (cleaned.length === 1) return cleaned[0];
    return `${cleaned[0]}. ${cleaned.slice(1).join(' ')}`;
};

const extractFlattenMessages = (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const payload = value as {
        formErrors?: unknown;
        fieldErrors?: unknown;
    };
    const formErrors = Array.isArray(payload.formErrors)
        ? payload.formErrors.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    const fieldErrors = payload.fieldErrors && typeof payload.fieldErrors === 'object'
        ? Object.values(payload.fieldErrors as Record<string, unknown>)
            .flatMap((entry) => Array.isArray(entry) ? entry : [])
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    return joinParts([...formErrors, ...fieldErrors]);
};

export function getApiErrorMessage(payload: unknown, fallback: string): string {
    if (!payload) return fallback;
    const data = payload as ErrorPayload;

    const errorText = typeof data.error === 'string' ? data.error : '';
    const messageText = typeof data.message === 'string' ? data.message : '';

    const combined = joinParts([errorText, messageText].filter(Boolean));
    if (combined) return combined;

    const derivedFromError = extractFlattenMessages(data.error);
    if (derivedFromError) return derivedFromError;

    const derivedFromMessage = extractFlattenMessages(data.message);
    if (derivedFromMessage) return derivedFromMessage;

    return fallback;
}
