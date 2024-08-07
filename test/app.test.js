const logger = require("../src/logger");

logger.level = "error";

const expect = require("chai").expect;
const proxyquire = require("proxyquire");
const request = require("supertest");

const db = {};
const noticeValue =
  "v1 is being deprecated. Use v2 instead. See https://analytics.usa.gov/developer";

const app = proxyquire("../src/app", {
  "./db": db,
});

const handleIfRouteNotice = (route, arr) => {
  if (route === "v1.1") {
    return arr.map((object) => {
      return { ...object, notice: noticeValue };
    });
  }
  return arr;
};

const routes = ["v1.1", "v2"];

routes.forEach((route) => {
  describe(`app with ${route}`, () => {
    beforeEach(() => {
      db.query = () => Promise.resolve();
    });

    it("should pass params from the url to db.query and render the result", (done) => {
      db.query = (params) => {
        expect(params.reportAgency).to.equal("fake-agency");
        expect(params.reportName).to.equal("fake-report");
        const arr = handleIfRouteNotice(route, [
          { id: 1, date: new Date("2017-01-01") },
          { id: 2, date: new Date("2017-01-02") },
        ]);
        return Promise.resolve(arr);
      };

      const dataRequest = request(app)
        .get(`/${route}/agencies/fake-agency/reports/fake-report/data`)
        .expect(200);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = handleIfRouteNotice(route, [
            { id: 1, date: "2017-01-01" },
            { id: 2, date: "2017-01-02" },
          ]);
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });

    it("should not pass the agency param if the request does not specify an agency", (done) => {
      db.query = (params) => {
        expect(params.reportAgency).to.be.undefined;
        expect(params.reportName).to.equal("fake-report");
        const arr = handleIfRouteNotice(route, [
          { id: 1, date: new Date("2017-01-01") },
          { id: 2, date: new Date("2017-01-02") },
        ]);
        return Promise.resolve(arr);
      };

      const dataRequest = request(app)
        .get(`/${route}/reports/fake-report/data`)
        .expect(200);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = handleIfRouteNotice(route, [
            { id: 1, date: "2017-01-01" },
            { id: 2, date: "2017-01-02" },
          ]);
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });

    it("should merge the params in the url with query params", (done) => {
      db.query = (params) => {
        expect(params.reportAgency).to.equal("fake-agency");
        expect(params.reportName).to.equal("fake-report");
        expect(params.limit).to.equal("50");
        const arr = handleIfRouteNotice(route, [
          { id: 1, date: new Date("2017-01-01") },
          { id: 2, date: new Date("2017-01-02") },
        ]);
        return Promise.resolve(arr);
      };

      const dataRequest = request(app)
        .get(`/${route}/agencies/fake-agency/reports/fake-report/data?limit=50`)
        .expect(200);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = handleIfRouteNotice(route, [
            { id: 1, date: "2017-01-01" },
            { id: 2, date: "2017-01-02" },
          ]);
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });

    it("should respond with a 400 if db.query rejects", (done) => {
      db.query = () =>
        Promise.reject("This is a test of the emergency broadcast system.");

      const dataRequest = request(app)
        .get(`/${route}/agencies/fake-agency/reports/fake-report/data`)
        .expect(400);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = {
            message: "An error occurred. Please check the application logs.",
            status: 400,
          };
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });

    it("should respond with a 400 if the domain report is not one of the acceptable kinds of reports", (done) => {
      db.query = (params) => {
        expect(params.domain).to.equal("fakeiscool.gov");
        expect(params.reportName).to.equal("browser");
        return Promise.resolve([
          {
            id: 1,
            date: new Date("2017-01-01"),
            data: { domain: "fakeiscool.gov" },
          },
          {
            id: 2,
            date: new Date("2017-01-02"),
            data: { domain: "bobtown.gov" },
          },
        ]);
      };

      const dataRequest = request(app)
        .get(`/${route}/domain/fakeiscool.gov/reports/browser/data`)
        .expect(400);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = {
            message:
              "You are requesting a report that cannot be filtered on domain. Please try one of the following reports: site, domain, download, second-level-domain.",
            status: 400,
          };
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });

    it("should pass params from the url to db.query and render the result for a domain query for a non-download report", (done) => {
      db.query = (params) => {
        expect(params.domain).to.equal("fakeiscool.gov");
        expect(params.reportName).to.equal("site");
        const arr = handleIfRouteNotice(route, [
          {
            id: 1,
            date: new Date("2017-01-01"),
            report_name: "site",
            data: { domain: "fakeiscool.gov" },
          },
        ]);
        return Promise.resolve(arr);
      };

      const dataRequest = request(app)
        .get(`/${route}/domain/fakeiscool.gov/reports/site/data`)
        .expect(200);

      dataRequest
        .then((actualResponse) => {
          const expectedResponseBody = handleIfRouteNotice(route, [
            {
              id: 1,
              date: "2017-01-01",
              report_name: "site",
              domain: "fakeiscool.gov",
            },
          ]);
          expect(actualResponse.body).to.deep.equal(expectedResponseBody);
          done();
        })
        .catch(done);
    });
  });
});

describe(`app with unspupported version`, () => {
  beforeEach(() => {
    db.query = () => Promise.resolve();
  });

  it("should not accept unsupported versions", (done) => {
    const unsupportedVersion = "v2.x";

    db.query = (params) => {
      expect(params.reportAgency).to.equal("fake-agency");
      expect(params.reportName).to.equal("fake-report");
      const arr = handleIfRouteNotice(unsupportedVersion, [
        { id: 1, date: new Date("2017-01-01") },
        { id: 2, date: new Date("2017-01-02") },
      ]);
      return Promise.resolve(arr);
    };

    const expectedErrorMessage =
      "Version not found. Visit https://analytics.usa.gov/developer for information on the latest supported version.";

    const dataRequest = request(app)
      .get(
        `/${unsupportedVersion}/agencies/fake-agency/reports/fake-report/data`,
      )
      .expect(404);

    dataRequest
      .then((actualResponse) => {
        const expectedResponse = {
          _body: expectedErrorMessage,
          status: 404,
        };
        expect(actualResponse).to.include(expectedResponse);
        done();
      })
      .catch(done);
  });
});
