import * as winston from 'winston';

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Define custom log levels following the npm standard
const customLogLevels = {
  levels: {
    error: 0,   // 🔴 Critical errors
    warn: 1,    // 🟠 Warnings
    info: 2,    // 🟢 General information
    http: 3,    // 🔵 HTTP-level logs
    verbose: 4, // 🔍 Detailed logs
    debug: 5,   // 🐞 Debugging messages
    silly: 6,   // 🤪 Extra noisy logs for deep debugging
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
  },
};

// Apply custom colors for better console visibility
winston.addColors(customLogLevels.colors);

// Configure Winston logger for console output only
const logger = winston.createLogger({
  levels: customLogLevels.levels,
  level: DEFAULT_LOG_LEVEL, // Default log level
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] [LIB]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      level: DEFAULT_LOG_LEVEL, // Log everything down to 'silly'
    }),
  ],
});

// Export logging interface for use across the library
export const Log = {
  error: (cls: string, method: string, message: string) => logger.error(`${cls}:${method} - ${message}`),
  warn: (cls: string, method: string, message: string) => logger.warn(`${cls}:${method} - ${message}`),
  info: (cls: string, method: string, message: string) => logger.info(`${cls}:${method} - ${message}`),
  http: (cls: string, method: string, message: string) => logger.http(`${cls}:${method} - ${message}`),
  verbose: (cls: string, method: string, message: string) => logger.verbose(`${cls}:${method} - ${message}`),
  debug: (cls: string, method: string, message: string) => logger.debug(`${cls}:${method} - ${message}`),
  silly: (cls: string, method: string, message: string) => logger.silly(`${cls}:${method} - ${message}`),
  setLevel: (level: keyof typeof customLogLevels.levels) => {
    logger.level = level; // Dynamically set log level
    logger.transports.forEach((transport) => {
      transport.level = level;
    });
  },
  raw: logger, // Expose raw logger for advanced use
};
