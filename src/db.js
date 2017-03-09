const knex = require("knex")
const config = require("./config")

const db = knex({ client: "pg", connection: config.postgres })

const query = ({ report_name, report_agency = null, limit = 1000, page = 1 }) => {
  limit = _limit(limit)
  page = _page(page)

  return db("analytics_data")
    .where({ report_name, report_agency })
    .orderBy("date_time", "desc")
    .limit(limit)
    .offset((page - 1) * limit)
}

const _limit = (limit) => {
  limit = parseInt(limit)

  if (limit > 10000 || limit <= 0) {
    return 10000
  } else if (limit <= 0) {
    return 1000
  } else {
    return limit
  }
}

const _page = (page) => {
  page = parseInt(page)

  return Math.max(1, page)
}

module.exports = { query }
