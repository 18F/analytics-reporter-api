const db = require('./db');

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
    const response = result.map(dataPoint => Object.assign({
      id: dataPoint.id,
      date: formatDateForDataPoint(dataPoint),
      report_name: dataPoint.report_name,
      report_agency: dataPoint.report_agency
    }, dataPoint.data));
    const filteredResponse = filterDownloadResponse(response, params);
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

module.exports = { fetchData, checkDomainFilter };
