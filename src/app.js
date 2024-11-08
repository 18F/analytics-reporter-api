const express = require("express");
const apiDataGovFilter = require("./api-data-gov-filter");
const db = require("./db");
const logger = require("./logger");
const router = express.Router();
const routesVersioning = require("express-routes-versioning")();
const yup = require("yup");

const app = express();

if (process.env.NODE_ENV != "test") {
  app.use(logger.middleware());
}

app.use(apiDataGovFilter);
app.use(router);
app.use(logger.errorLoggingMiddleware());

/**
 * Converts date object to an ISO date string without time and zone.
 * @param dataPoint
 */
const formatDateForDataPoint = (dataPoint) => {
  if (dataPoint.date) {
    return dataPoint.date.toISOString().slice(0, 10);
  }
  return null;
};

const acceptableDomainReports = [
  "site",
  "domain",
  "download",
  "second-level-domain",
];

/**
 * Currently the only regex match in request validation is on date string
 * formatting. Hard code that the yup.string().matches() validation returns a
 * helpful error message when dates are not formatted correctly.
 */
yup.setLocale({
  string: {
    matches: "must be a date in format 'YYYY-MM-DD'",
  },
});

const checkDomainFilter = (req, res) => {
  if (
    acceptableDomainReports.includes(req.params.reportName) &&
    req.params.domain
  ) {
    return fetchData(req, res);
  }
  const tryReportText = acceptableDomainReports.join(", ");
  res.status(400);
  return res.json({
    message: `You are requesting a report that cannot be filtered on domain. Please try one of the following reports: ${tryReportText}.`,
    status: 400,
  });
};

const fetchData = (req, res) => {
  try {
    validateRequest(req);
  } catch (err) {
    res.status(400);
    return res.json({
      message: `Invalid request params: ${err}`,
      status: 400,
    });
  }
  const params = Object.assign(req.query, req.params);
  return db
    .query(params)
    .then((result) => {
      const response = result.map((dataPoint) =>
        Object.assign(
          {
            notice:
              req.version === "1.1"
                ? "v1 is being deprecated. Use v2 instead. See https://analytics.usa.gov/developer"
                : undefined,
            id: dataPoint.id,
            date: formatDateForDataPoint(dataPoint),
            report_name: dataPoint.report_name,
            report_agency: dataPoint.report_agency,
          },
          dataPoint.data,
        ),
      );

      res.json(response);
    })
    .catch((err) => {
      console.error("Unexpected Error:", err);
      res.status(500);
      return res.json({
        message: "An error occurred. Please check the application logs.",
        status: 500,
      });
    });
};

const validateRequest = (req) => {
  const isoDateRegex = /^\d{4}-([0][1-9]|1[0-2])-([0][1-9]|[1-2]\d|3[01])$/;
  const requestSchema = yup.object({
    query: yup.object({
      before: yup.string().matches(isoDateRegex),
      after: yup.string().matches(isoDateRegex),
      limit: yup.number().positive().integer().max(10000),
      page: yup.number().positive().integer(),
    }),
    params: yup.object({
      domain: yup.string(),
      reportAgency: yup.string(),
      reportName: yup.string(),
      version: yup.string(),
    }),
  });
  return requestSchema.validateSync(req);
};

app.get("/", (req, res) => {
  res.json({
    current_time: new Date(),
  });
});

// middleware
router.use("/v:version/", function (req, res, next) {
  const version = req.params.version;
  req.version = version;
  next();
});

router.get(
  "/v:version/reports/:reportName/data",
  routesVersioning(
    {
      "1.1.0": fetchData,
      "~2.0.0": fetchData,
    },
    NoMatchFoundCallback,
  ),
);

router.get(
  "/v:version/agencies/:reportAgency/reports/:reportName/data",
  routesVersioning(
    {
      "1.1.0": fetchData,
      "~2.0.0": fetchData,
    },
    NoMatchFoundCallback,
  ),
);

router.get(
  "/v:version/domain/:domain/reports/:reportName/data",
  routesVersioning(
    {
      "1.1.0": checkDomainFilter,
      "~2.0.0": checkDomainFilter,
    },
    NoMatchFoundCallback,
  ),
);

function NoMatchFoundCallback(req, res) {
  res
    .status(404)
    .json(
      "Version not found. Visit https://analytics.usa.gov/developer for information on the latest supported version.",
    );
}

module.exports = app;
