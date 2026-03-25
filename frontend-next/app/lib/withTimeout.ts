export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000, message = 'Request timed out'): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                reject(new Error(message));
            }, timeoutMs);
        }),
    ]);
}
