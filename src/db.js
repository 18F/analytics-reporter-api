const knex = require('knex');

const config = require('./config');

const db = knex({ client: 'pg', connection: config.postgres });

const parseLimitParam = (limitParam) => {
  const limit = parseInt(limitParam, 10);

  if (limit > 10000 || limit <= 0) {
    return 10000;
  } else if (limit <= 0) {
    return 1000;
  }
  return limit;
};

const parsePageParam = (pageParam) => {
  const page = parseInt(pageParam, 10);
  return Math.max(1, page);
};

const buildTimeQuery = (before, after) => {
  if (before && after) {
    return ['"date" <= ?::date AND "date" >= ?::date', [before, after]];
  }
  if (before) {
    return ['"date" <= ?::date', [before]];
  }
  if (after) {
    return ['"date" >= ?::date', [after]];
  }
  return [true];
};

const queryDomain = (domain, reportName, limitParam, pageParam, before, after) => {
  const timeQuery = buildTimeQuery(before, after);
  return db('analytics_data')
    .where({ report_name: reportName })
    .whereRaw('data->> \'domain\' = ?', [domain])
    .whereRaw(...timeQuery)
    .orderBy('date', 'desc')
    .orderByRaw('CAST(data->>\'total_events\' AS INTEGER) desc')
    .orderByRaw('CAST(data->>\'visits\' AS INTEGER) desc')
    .limit(limitParam)
    .offset((pageParam - 1) * limitParam);
};

const query = ({ reportName,
   reportAgency = null,
  limit = 1000,
  page = 1,
  domain = null,
  after = null,
  before = null
 }) => {
  const limitParam = parseLimitParam(limit);
  const pageParam = parsePageParam(page);
  if (domain && reportName !== 'download') {
    return queryDomain(domain, reportName, limitParam, pageParam, before, after);
  }
  const recordQuery = Object.assign({ report_name: reportName, report_agency: reportAgency });
  const timeQuery = buildTimeQuery(before, after);

  return db('analytics_data')
    .where(recordQuery)
    .whereRaw(...timeQuery)
    .orderBy('date', 'desc')
    .orderByRaw('CAST(data->>\'total_events\' AS INTEGER) desc')
    .orderByRaw('CAST(data->>\'visits\' AS INTEGER) desc')
    .limit(limitParam)
    .offset((pageParam - 1) * limitParam);
};

module.exports = { query };
