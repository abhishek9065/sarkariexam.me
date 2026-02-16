import type { NextFunction, Request, Response } from 'express';

import authRouter from '../../routes/auth.js';

export const delegateToAuthRouter = (targetPath: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalUrl = req.url;
        const originalOriginalUrl = req.originalUrl;
        const queryIndex = req.url.indexOf('?');
        const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';

        req.url = `${targetPath}${query}`;
        req.originalUrl = req.originalUrl.replace('/api/admin-auth', '/api/auth');

        (authRouter as any).handle(req, res, (error: unknown) => {
            req.url = originalUrl;
            req.originalUrl = originalOriginalUrl;
            next(error as any);
        });
    };
};
