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

const query = ({ reportName,
   reportAgency = null,
  limit = 1000,
  page = 1,
  domain = null }) => {
  const limitParam = parseLimitParam(limit);
  const pageParam = parsePageParam(page);
  const recordQuery = { report_name: reportName, report_agency: reportAgency, domain: domain };
  return db('analytics_data')
    .where(recordQuery)
    .orderBy('date', 'desc')
    .orderByRaw('CAST(data->>\'total_events\' AS INTEGER) desc')
    .orderByRaw('CAST(data->>\'visits\' AS INTEGER) desc')
    .limit(limitParam)
    .offset((pageParam - 1) * limitParam);
};

module.exports = { query };
