const expressWinston = require('express-winston');
const winston = require('winston');
const config = require('./config');

const logger = expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  expressFormat: true,
  colorize: true,
});

module.exports = logger;
