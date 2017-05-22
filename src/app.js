const express = require('express');
const apiDataGovFilter = require('./api-data-gov-filter');
const db = require('./db');
const logger = require('./logger');

const app = express();
app.use(logger.middleware);
app.use(apiDataGovFilter);

const formatDateForDataPoint = (dataPoint) => {
  if (dataPoint.date) {
    return dataPoint.date.toISOString().slice(0, 10);
  }
  return null;
};

const fetchData = (req, res) => {
  const params = Object.assign(req.query, req.params);
  db.query(params).then(result => {
    const response = result.map(dataPoint => Object.assign({
      id: dataPoint.id,
      date: formatDateForDataPoint(dataPoint),
      report_name: dataPoint.report_name,
      report_agency: dataPoint.report_agency
    }, dataPoint.data));
    res.json(response);
  }).catch(err => {
    logger.error('Unexpected Error:', err);
    res.status(400);
    res.json({
      message: 'An error occured. Please check the application logs.',
      status: 400
    });
  });
};

app.get('/', (req, res) => {
  res.json({
    current_time: new Date()
  });
});
app.get('/v1/agencies/:reportAgency/reports/:reportName/data', fetchData);
app.get('/v1/reports/:reportName/data', fetchData);

module.exports = app;
