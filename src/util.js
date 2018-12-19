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

const filterDownloadResponse = (response, params) => {
  if (params.domain && params.reportName === 'download') {
    return response.filter(entry => entry.page.includes(params.domain));
  }
  return response;
};

module.exports = { formatDateForDataPoint, acceptableDomainReports, filterDownloadResponse };
