type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorContext {
    componentStack?: string;
    [key: string]: unknown;
}

class ErrorService {
    private static instance: ErrorService;

    private constructor() { }

    public static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    public logError(error: Error | unknown, context?: ErrorContext, severity: ErrorSeverity = 'error'): void {
        const errorObj = this.normalizeError(error);

        // 1. Console Logging (Formatted for development)
        if (process.env.NODE_ENV === 'development') {
            const style = severity === 'error' || severity === 'critical'
                ? 'color: red; font-weight: bold;'
                : 'color: orange; font-weight: bold;';

            console.group(`%c[${severity.toUpperCase()}] ${errorObj.name}`, style);
            console.log('Message:', errorObj.message);
            console.log('Context:', context);
            console.log('Stack:', errorObj.stack);
            console.groupEnd();
        } else {
            // Production Logging (Simplified to avoid leaking too much info to console, but enough for debugging)
            console.error(`[${severity.toUpperCase()}] ${errorObj.message}`, { context });
        }

        // 2. Sentry / External Monitoring Integration (Placeholder)
        if (typeof window !== 'undefined' && (window as any).Sentry) { // eslint-disable-line @typescript-eslint/no-explicit-any
            (window as any).Sentry.captureException(errorObj, { // eslint-disable-line @typescript-eslint/no-explicit-any
                level: severity === 'critical' ? 'fatal' : severity,
                extra: context as Record<string, unknown>,
            });
        }

        // 3. Custom logic (e.g., toast notifications for critical errors could be triggered here via an event emitter)
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) return error;

        if (typeof error === 'string') return new Error(error);

        if (typeof error === 'object' && error !== null) {
            try {
                return new Error(JSON.stringify(error));
            } catch {
                return new Error('Unknown object error');
            }
        }

        return new Error('Unknown error occurred');
    }
}

export const errorService = ErrorService.getInstance();
