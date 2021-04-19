const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/logger');

if (process.env.NEW_RELIC_APP_NAME) {
	console.log("Starting New Relic");
	require("newrelic");
}

app.listen(config.port, () => {
  console.log(`Listening on ${config.port}`);
});
