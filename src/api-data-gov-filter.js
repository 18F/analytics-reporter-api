const config = require("./config");

/**
 * @param {import("express").Request} req the incoming HTTP request.
 * @param {import("express").Response} res the HTTP response object.
 * @param {Function} next callback to execute when the filter is complete.
 * @returns {void} the result of the next callback.
 */
const apiDataGovFilter = (req, res, next) => {
  if (!config.api_data_gov_secret || req.path === "/") {
    return next();
  } else if (
    req.headers["api-data-gov-secret"] !== config.api_data_gov_secret
  ) {
    res.status(403);
    return res.json({
      message: "Unauthorized. See https://analytics.usa.gov/developer",
      status: 403,
    });
  }
  return next();
};

module.exports = apiDataGovFilter;
