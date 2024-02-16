const knex = require("knex");

const config = require("./config");

const db = knex({ client: "pg", connection: config.postgres });

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

const queryDomain = (
  domain,
  reportName,
  limitParam,
  pageParam,
  before,
  after,
  dbTable,
) => {
  const timeQuery = buildTimeQuery(before, after);

  return (
    db(dbTable)
      .where({ report_name: reportName })
      .whereRaw("data->> 'domain' = ?", [domain])
      .whereRaw(...timeQuery)
      // Using `orderByRaw` in order to specifcy NULLS LAST, see:
      // https://github.com/knex/knex/issues/282
      .orderByRaw("date desc NULLS LAST")
      // Previously, this was ordered by data-->total_events and data-->visits. Those queries
      // were very slow, and from what I can tell, it's not possible to add the proper multi-field
      // index on (date, data-->total_events, data-->visits) to speed up the queries, because `data`
      // is a JSON field. See this (rather wordy, sorry) thread for more details:
      // https://github.com/18F/analytics-reporter-api/issues/161#issuecomment-874860764
      //
      // Ordering by `id` here does _not_ guarantee ordering based on total_events or visits. However,
      // the order in which data is inserted into the table (by code in the analytics-reporter repo, which
      // pulls from Google Analytics) happens to be in order by visits or total_events, so ordering by
      // IDs may in practice keep the same ordering as before - but it would be best not to rely on this.
      // A longer term fix would be to move the total_events and visits fields to their own columns.
      .orderBy("id", "asc")
      .limit(limitParam)
      .offset((pageParam - 1) * limitParam)
  );
};

const query = ({
  reportName,
  reportAgency = null,
  limit = 1000,
  page = 1,
  domain = null,
  after = null,
  before = null,
  version,
}) => {
  // we have different tables for new ga4
  // TODO: once UA has sunset we can remove this
  const dbTable = version === "1.1" ? "analytics_data" : "analytics_data_ga4";
  const limitParam = parseLimitParam(limit);
  const pageParam = parsePageParam(page);
  if (domain && reportName !== "download") {
    return queryDomain(
      domain,
      reportName,
      limitParam,
      pageParam,
      before,
      after,
      dbTable,
    );
  }
  const recordQuery = Object.assign({
    report_name: reportName,
    report_agency: reportAgency,
  });
  const timeQuery = buildTimeQuery(before, after);

  return (
    db(dbTable)
      .where(recordQuery)
      .whereRaw(...timeQuery)
      // Using `orderByRaw` in order to specifcy NULLS LAST, see:
      // https://github.com/knex/knex/issues/282
      .orderByRaw("date desc NULLS LAST")
      // Previously, this was ordered by data-->total_events and data-->visits. Those queries
      // were very slow, and from what I can tell, it's not possible to add the proper multi-field
      // index on (date, data-->total_events, data-->visits) to speed up the queries, because `data`
      // is a JSON field. See this (rather wordy, sorry) thread for more details:
      // https://github.com/18F/analytics-reporter-api/issues/161#issuecomment-874860764
      //
      // Ordering by `id` here does _not_ guarantee ordering based on total_events or visits. However,
      // the order in which data is inserted into the table (by code in the analytics-reporter repo, which
      // pulls from Google Analytics) happens to be in order by visits or total_events, so ordering by
      // IDs may in practice keep the same ordering as before - but it would be best not to rely on this.
      // A longer term fix would be to move the total_events and visits fields to their own columns.
      .orderBy("id", "asc")
      .limit(limitParam)
      .offset((pageParam - 1) * limitParam)
  );
};

module.exports = { query, queryDomain, buildTimeQuery };
