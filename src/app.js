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
    res.json(result)
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
  console.log(req.headers)
  res.json({
    current_time: new Date(),
  })
})
app.get("/agencies/:report_agency/reports/:report_name/data", fetchData)
app.get("/reports/:report_name/data", fetchData)

module.exports = app
