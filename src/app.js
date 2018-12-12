const express = require('express');
const apiDataGovFilter = require('./api-data-gov-filter');

const logger = require('./logger');
const controllers = require('./controllers');
const cronDrivenDeletionOfOldEntries = require('./cron-deletion');

// Init Express
const app = express();
app.use(logger.middleware);
app.use(apiDataGovFilter);

// Routes
app.get('/', (req, res) => {
  res.json({
    current_time: new Date()
  });
});
app.get('/v1.1/domain/:domain/reports/:reportName/data', controllers.checkDomainFilter);
app.get('/v1.1/agencies/:reportAgency/reports/:reportName/data', controllers.fetchData);
app.get('/v1.1/reports/:reportName/data', controllers.fetchData);

// Delete historical data older than 18 months ago
cronDrivenDeletionOfOldEntries.cronJob(18).start();

module.exports = app;
