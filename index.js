const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/logger');

app.listen(config.port, () => {
  logger.info(`Listening on ${config.port}`);
});
