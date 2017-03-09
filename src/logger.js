const expressWinston = require("express-winston")
const logger = require("winston")
const config = require("./config")

logger.level = config.log_level
logger.remove(logger.transports.Console)
logger.add(logger.transports.Console, {colorize: true})

logger.middleware = (req, res, next) => {
  const requestLogger = expressWinston.logger({
    transports: [
      new logger.transports.Console({ colorize: true })
    ],
    requestWhitelist: expressWinston.requestWhitelist.concat("body"),
  })

  if (logger.levels[logger.level] >= 2) {
    requestLogger(req, res, next)
  } else {
    next()
  }
}

module.exports = logger
