const expressWinston = require("express-winston");
const winston = require("winston");
const config = require("./config");

const loggerConfig = () => {
  return {
    level: config.log_level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
    transports: [
      new winston.transports.Console({
        level: config.log_level,
      }),
    ],
    headerBlacklist: ["x-api-key", "api-data-gov-secret"],
  };
};

/**
 * @returns {import("winston")} the configured winston instance
 */
const initialize = () => {
  return winston.createLogger(loggerConfig());
};

/**
 * @returns {import("express-winston")} the configured express-winston
 * logging middleware instance
 */
const middleware = () => {
  return expressWinston.logger(loggerConfig());
};

/**
 * @returns {import("express-winston")} the configured express-winston error
 * logging middleware instance
 */
const errorLoggingMiddleware = () => {
  return expressWinston.errorLogger(loggerConfig());
};

module.exports = { initialize, middleware, errorLoggingMiddleware };
