const knexfile = require("../knexfile");

module.exports = {
  api_data_gov_secret: process.env.API_DATA_GOV_SECRET,
  port: process.env.PORT || 4444,
  postgres: knexfile[process.env.NODE_ENV || "production"].connection,
  log_level: process.env.LOG_LEVEL || "info",
};
