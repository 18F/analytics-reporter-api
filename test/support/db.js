const knex = require("knex")

const config = {
  postgres: {
    database: process.env.TRAVIS ? "travis_ci_test" : "analytics-api-test",
  },
}

const client = knex({ client: "pg", connection: config.postgres })

const resetSchema = () => {
  return client("analytics_data").delete()
}

module.exports = { client, config, resetSchema }
