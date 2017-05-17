const express = require("express")
const apiDataGovFilter = require("./api-data-gov-filter")
const db = require("./db")
const logger = require("./logger")

const app = express()
app.use(logger.middleware)
app.use(apiDataGovFilter)

const fetchData = (req, res) => {
  const params = Object.assign(req.query, req.params)
  db.query(params).then(result => {
    response = result.map(dataPoint => Object.assign({
      id: dataPoint.id,
      date_time: dataPoint.date_time,
      report_name: dataPoint.report_name,
      report_agency: dataPoint.report_agency,
    }, dataPoint.data))
    res.json(response)
  }).catch(err => {
    logger.error("Unexpected Error:", err)
    res.status(400)
    res.json({
      message: "An error occured. Please check the application logs.",
      status: 400,
    })
  })
}

app.get("/", (req, res) => {
  res.json({
    current_time: new Date(),
  })
})
app.get("/agencies/:report_agency/reports/:report_name/data", fetchData)
app.get("/reports/:report_name/data", fetchData)

module.exports = app
