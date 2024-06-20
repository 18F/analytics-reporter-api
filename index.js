if (process.env.NEW_RELIC_APP_NAME) {
  console.log("Starting New Relic");
  require("newrelic");
}

const app = require("./src/app");
const config = require("./src/config");
const logger = require("./src/logger").initialize();

app.listen(config.port, () => {
  logger.info(`Listening on ${config.port}`);
});
