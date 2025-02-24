import * as vscode from 'vscode';
import * as winston from 'winston';
import { Log as LibLog } from 'hcs-lib'; // Import library logger

// 🔥 Define default log level based on environment variables
const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// 🔥 Define custom log levels following the npm standard
const customLogLevels = {
  levels: {
    error: 0,   // 🔴 Critical errors
    warn: 1,    // 🟠 Warnings
    info: 2,    // 🟢 General information
    http: 3,    // 🔵 HTTP-related logs
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

// 🔥 Apply custom colors for console output
winston.addColors(customLogLevels.colors);

// 🔥 Create the Winston logger for the extension
const logger = winston.createLogger({
  levels: customLogLevels.levels,
  level: DEFAULT_LOG_LEVEL, // Default log level
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] [EXT]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      level: DEFAULT_LOG_LEVEL, // Console output level
    }),
  ],
});

// 🔥 VSCode Output Channel for displaying logs inside VSCode
const vscodeOutputChannel = vscode.window.createOutputChannel('HCSTools Logs');

// 🔥 Function to log messages to both console and VSCode output channel
function logToVSCode(level: keyof typeof customLogLevels.levels, message: string) {
  logger.log(level, message);
  vscodeOutputChannel.appendLine(`[${level.toUpperCase()}] ${message}`);
}

// 🔥 Exported logger interface for the extension
export const Log = {
  error: (cls: string, method: string, message: string) => logToVSCode('error', `${cls}:${method} - ${message}`),
  warn: (cls: string, method: string, message: string) => logToVSCode('warn', `${cls}:${method} - ${message}`),
  info: (cls: string, method: string, message: string) => logToVSCode('info', `${cls}:${method} - ${message}`),
  http: (cls: string, method: string, message: string) => logToVSCode('http', `${cls}:${method} - ${message}`),
  verbose: (cls: string, method: string, message: string) => logToVSCode('verbose', `${cls}:${method} - ${message}`),
  debug: (cls: string, method: string, message: string) => logToVSCode('debug', `${cls}:${method} - ${message}`),
  silly: (cls: string, method: string, message: string) => logToVSCode('silly', `${cls}:${method} - ${message}`),
  
  // 🔥 Dynamically set log level for both extension and library
  setLevel: (level: keyof typeof customLogLevels.levels) => {
    logger.level = level;
    logger.transports.forEach((transport) => {
      transport.level = level; // Update console output level
    });

    // 🔥 Synchronize library log level
    LibLog.setLevel(level);
  },

  outputChannel: vscodeOutputChannel,
  raw: logger, // Export raw Winston logger for advanced use
};
