const express = require('express');
const apiDataGovFilter = require('./api-data-gov-filter');
const db = require('./db');

const logger = require('./logger');
const util = require('./util');
const cronDrivenDeletionOfOldEntries = require('./cron-deletion');

const fetchData = (req, res) => {
  const params = Object.assign(req.query, req.params);
  db.query(params).then(result => {
    const response = result.map(dataPoint => Object.assign({
      id: dataPoint.id,
      date: util.formatDateForDataPoint(dataPoint),
      report_name: dataPoint.report_name,
      report_agency: dataPoint.report_agency
    }, dataPoint.data));
    const filteredResponse = util.filterDownloadResponse(response, params);
    res.json(filteredResponse);
  }).catch(err => {
    logger.error('Unexpected Error:', err);
    res.status(400);
    return res.json({
      message: 'An error occurred. Please check the application logs.',
      status: 400
    });
  });
};

const checkDomainFilter = (req, res) => {
  if (util.acceptableDomainReports.includes(req.params.reportName) &&
    req.params.domain) {
    return fetchData(req, res);
  }
  const tryReportText = util.acceptableDomainReports.join(', ');
  res.status(400);
  return res.json({
    message: `You are requesting a report that cannot be filtered on domain. Please try one of the following reports: ${tryReportText}.`,
    status: 400
  });
};

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
app.get('/v1.1/domain/:domain/reports/:reportName/data', checkDomainFilter);
app.get('/v1.1/agencies/:reportAgency/reports/:reportName/data', fetchData);
app.get('/v1.1/reports/:reportName/data', fetchData);

// Delete historical data older than 24 months ago
cronDrivenDeletionOfOldEntries.cronJob(24).start();

module.exports = app;
