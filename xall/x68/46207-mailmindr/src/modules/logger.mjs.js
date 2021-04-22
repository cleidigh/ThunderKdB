const LogLevel = {
    ALL: 0,
    DEBUG: 20,
    INFO: 40,
    WARN: 50,
    ERROR: 60,
    FATAL: 70
};

export const logger = {
    debug: (...args) => console.debug('[mailmindr]', ...args),
    log: (...args) => console.log('[mailmindr]', ...args),
    info: (...args) => console.info('[mailmindr]', ...args),
    warn: (...args) => console.warn('[mailmindr]', ...args),
    error: (...args) => console.error('[mailmindr]', ...args)
};

export const createLogger = (scopeName, level, filterFunction) => {
    const logLevel = level ?? LogLevel.WARN;

    return {
        debug: (...args) => {
            if (logLevel > LogLevel.DEBUG) {
                return;
            }
            logger.debug(`(${scopeName})`, ...args);
        },
        log: (...args) => {
            if (logLevel > LogLevel.DEBUG) {
                return;
            }
            logger.log(`(${scopeName})`, ...args);
        },
        info: (...args) => {
            if (logLevel > LogLevel.INFO) {
                return;
            }
            logger.info(`(${scopeName})`, ...args);
        },
        warn: (...args) => {
            if (logLevel > LogLevel.WARN) {
                return;
            }
            logger.warn(`(${scopeName})`, ...args);
        },
        error: (...args) => {
            if (logLevel > LogLevel.ERROR) {
                return;
            }
            logger.error(`(${scopeName})`, ...args);
        }
    };
};

export const createCorrelationId = (
    readableContextIdentifier,
    parenCorrelationId
) => {
    const uniqueId = Math.random()
        .toString(16)
        .replace('.', 'x');
    return `${
        parenCorrelationId || '' ? `${parenCorrelationId}::` : ''
    }${readableContextIdentifier || ''}/${uniqueId}`;
};
