module.exports = {
  port: process.env.PORT || 4444,
  postgres: {
    host : process.env.POSTGRES_HOST,
    user : process.env.POSTGRES_USER,
    password : process.env.POSTGRES_PASSWORD,
    database : process.env.POSTGRES_DATABASE || "analytics-reporter",
  },
  log_level: process.env.LOG_LEVEL || "info",
}
