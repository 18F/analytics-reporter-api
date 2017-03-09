const logger = require("../src/logger")
logger.level = "error"

const expect = require("chai").expect
const proxyquire = require("proxyquire")
const request = require("supertest-as-promised")

const db = {}

const app = proxyquire("../src/app", {
  "./db": db
})

describe("app", () => {
  beforeEach(() => {
    db.query = () => Promise.resolve()
  })

  it("should pass params from the url to db.query and render the result", done => {
    db.query = (params) => {
      expect(params["report_agency"]).to.equal("fake-agency")
      expect(params["report_name"]).to.equal("fake-report")
      return Promise.resolve(["row 1", "row 2"])
    }

    const dataRequest = request(app)
      .get("/agencies/fake-agency/reports/fake-report/data")
      .expect(200)

    dataRequest.then(response => {
      expect(response.body).to.deep.equal(["row 1", "row 2"])
      done()
    }).catch(done)
  })

  it("should not pass the agency param if the request does not specify and agency", done => {
    db.query = (params) => {
      expect(params["report_agency"]).to.be.undefined
      expect(params["report_name"]).to.equal("fake-report")
      return Promise.resolve(["row 1", "row 2"])
    }

    const dataRequest = request(app)
      .get("/reports/fake-report/data")
      .expect(200)

    dataRequest.then(response => {
      expect(response.body).to.deep.equal(["row 1", "row 2"])
      done()
    }).catch(done)
  })

  it("should merge the params in the url with query params", done => {
    db.query = (params) => {
      expect(params["report_agency"]).to.equal("fake-agency")
      expect(params["report_name"]).to.equal("fake-report")
      expect(params["limit"]).to.equal("50")
      return Promise.resolve(["row 1", "row 2"])
    }

    const dataRequest = request(app)
      .get("/agencies/fake-agency/reports/fake-report/data?limit=50")
      .expect(200)

    dataRequest.then(response => {
      expect(response.body).to.deep.equal(["row 1", "row 2"])
      done()
    }).catch(done)
  })

  it("should respond with a 400 if db.query rejects", done => {
    db.query = (params) => Promise.reject("This is a test of the emergency broadcast system.")

    const dataRequest = request(app)
      .get("/agencies/fake-agency/reports/fake-report/data")
      .expect(400)

    dataRequest.then(response => {
      expect(response.body).to.deep.equal({
        message: "An error occured. Please check the application logs.",
        status: 400,
      })
      done()
    }).catch(done)
  })
})
