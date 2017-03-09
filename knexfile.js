module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'analytics-reporter',
    },
  },
  production: {
    client: 'postgresql',
    connection: {
      host : process.env.POSTGRES_HOST,
      user : process.env.POSTGRES_USER,
      password : process.env.POSTGRES_PASSWORD,
      database : process.env.POSTGRES_DATABASE,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  test: {
    client: 'postgresql',
    connection: {
      database : process.env.TRAVIS ? "travis_ci_test" : "analytics-api-test",
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
}
