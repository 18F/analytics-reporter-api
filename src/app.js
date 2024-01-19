const express = require('express');
const apiDataGovFilter = require('./api-data-gov-filter');
const db = require('./db');
const logger = require('./logger');
const router = express.Router();
const routesVersioning = require('express-routes-versioning')();

const app = express();

if (process.env.NODE_ENV != 'test') {
  app.use(logger);
}
app.use(apiDataGovFilter);
app.use(router);

const formatDateForDataPoint = (dataPoint) => {
  if (dataPoint.date) {
    return dataPoint.date.toISOString().slice(0, 10);
  }
  return null;
};

const acceptableDomainReports = [
  'site',
  'domain',
  'download',
  'second-level-domain'
];

const checkDomainFilter = (req, res) => {
  if (acceptableDomainReports.includes(req.params.reportName) &&
  req.params.domain) {
    return fetchData(req, res);
  }
  const tryReportText = acceptableDomainReports.join(', ');
  res.status(400);
  return res.json({
    message: `You are requesting a report that cannot be filtered on domain. Please try one of the following reports: ${tryReportText}.`,
    status: 400
  });
};

const filterDownloadResponse = (response, params) => {
  if (params.domain && params.reportName === 'download') {
    return response.filter(entry => entry.page.includes(params.domain));
  }
  return response;
};

const fetchData = (req, res) => {
  const params = Object.assign(req.query, req.params);
  db.query(params).then(result => {
    const response = result.map(dataPoint => Object.assign(
    {
      notice: req.version === '1.1' ? 'v1 is no longer supported. Use v2 instead. See https://analytics.usa.gov/developer' : undefined,
      id: dataPoint.id,
      date: formatDateForDataPoint(dataPoint),
      report_name: dataPoint.report_name,
      report_agency: dataPoint.report_agency,
    }, dataPoint.data));

    const filteredResponse = filterDownloadResponse(response, params);
    res.json(filteredResponse);

  }).catch(err => {
    console.error('Unexpected Error:', err);
    res.status(400);
    return res.json({
      message: 'An error occurred. Please check the application logs.',
      status: 400
    });
  });
};

app.get('/', (req, res) => {
  res.json({
    current_time: new Date()
  });
});

// middleware
router.use('/v:version/', function(req, res, next) {
    const version = req.params.version;
    req.version = version
    next();
});

router.get('/v:version/reports/:reportName/data',
routesVersioning({
   "1.1.0": respondV1, // legacy
   "~2.0.0": fetchData,
}, NoMatchFoundCallback));

router.get('/v:version/domain/:domain/reports/:reportName/data',
routesVersioning({
   "1.1.0": respondDomainV1, // legacy
   "~2.0.0": checkDomainFilter,
}, NoMatchFoundCallback));

router.get('/v:version/agencies/:reportAgency/reports/:reportName/data',
routesVersioning({
   "1.1.0": respondV1, // legacy
   "~2.0.0": fetchData,
}, NoMatchFoundCallback));

function NoMatchFoundCallback(req, res) {
  res.status(404).json("Version not found. Visit https://analytics.usa.gov/developer for information on the latest supported version.");
}

// v1
function respondV1(req, res) {
  return fetchData(req, res)
}

function respondDomainV1(req, res) {
  return checkDomainFilter(req, res)
}

module.exports = app;
