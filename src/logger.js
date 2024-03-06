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
  };
};

const initialize = () => {
  return winston.createLogger(loggerConfig());
};

const middleware = () => {
  return expressWinston.logger(loggerConfig());
};

const errorLoggingMiddleware = () => {
  return expressWinston.errorLogger(loggerConfig());
};

module.exports = { initialize, middleware, errorLoggingMiddleware };
