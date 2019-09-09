const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/logger');

app.listen(config.port, () => {
  console.log(`Listening on ${config.port}`);
});
