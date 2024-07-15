module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.POSTGRES_HOST || "localhost",
      user: process.env.POSTGRES_USER || "analytics",
      password: process.env.POSTGRES_PASSWORD || "123abc",
      database: process.env.POSTGRES_DATABASE || "analytics-reporter",
    },
  },
  production: {
    client: "postgresql",
    connection: {
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
  test: {
    client: "postgresql",
    connection: {
      host: process.env.POSTGRES_HOST || "localhost",
      user: process.env.POSTGRES_USER || "analytics",
      password: process.env.POSTGRES_PASSWORD || "123abc",
      database: process.env.POSTGRES_DATABASE || "analytics_reporter_test",
      port: process.env.POSTGRES_PORT || 5431,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};
