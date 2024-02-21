const expect = require("chai").expect;
const proxyquire = require("proxyquire");
const database = require("./support/db");

const db = proxyquire("../src/db", {
  "./config": require("../src/config"),
});

describe("db", () => {
  const apiVersions = ["v1.1", "v2"];

  before((done) => {
    // Setup the test database client
    database.createClient().then(() => done());
  });

  after((done) => {
    // Clean up the test database client and the application database client
    database
      .destroyClient()
      .then(() => {
        return db.dbClient.destroy();
      })
      .then(() => done());
  });

  apiVersions.forEach((apiVersion) => {
    describe(`for API version ${apiVersion}`, () => {
      const table =
        apiVersion === "v1.1" ? "analytics_data" : "analytics_data_ga4";
      const queryVersion = apiVersion === `v1.1` ? "1.1" : "2";

      beforeEach((done) => {
        database.resetSchema(table).then(() => done());
      });

      describe(".query(params)", () => {
        it("should return all rows for the given agency and report", (done) => {
          database
            .client(table)
            .insert([
              { report_name: "my-report", report_agency: "my-agency" },
              { report_name: "not-my-report", report_agency: "my-agency" },
              { report_name: "my-report", report_agency: "not-my-agency" },
              { report_name: "my-report", report_agency: null },
            ])
            .then(() => {
              return db.query({
                reportName: "my-report",
                reportAgency: "my-agency",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(1);
              expect(results[0].report_name).to.equal("my-report");
              expect(results[0].report_agency).to.equal("my-agency");
              done();
            })
            .catch(done);
        });

        it("should return all rows without an agency if no agency name is given", (done) => {
          database
            .client(table)
            .insert([
              { report_name: "my-report", report_agency: "not-my-agency" },
              { report_name: "my-report", report_agency: null },
            ])
            .then(() => {
              return db.query({
                reportName: "my-report",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(1);
              expect(results[0].report_name).to.equal("my-report");
              expect(results[0].report_agency).to.be.null;
              done();
            })
            .catch(done);
        });

        it("should sort the rows according to the date column", (done) => {
          database
            .client(table)
            .insert([
              { report_name: "report", date: "2017-01-02" },
              { report_name: "report", date: "2017-01-01" },
              { report_name: "report", date: "2017-01-03" },
            ])
            .then(() => {
              return db.query({ reportName: "report", version: queryVersion });
            })
            .then((results) => {
              expect(results).to.have.length(3);
              results.forEach((result, index) => {
                const resultDate = result.date.toISOString().slice(0, 10);
                const expectedDate = `2017-01-0${3 - index}`;
                expect(resultDate).to.equal(expectedDate);
              });
              done();
            })
            .catch(done);
        });

        it("should limit the rows according to the limit param", (done) => {
          const rows = Array(5)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          database
            .client(table)
            .insert(rows)
            .then(() => {
              return db.query({
                reportName: "report",
                limit: 4,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(4);
              done();
            })
            .catch(done);
        });

        it("should default to a limit of 1000", (done) => {
          const rows = Array(1001)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          database
            .client(table)
            .insert(rows)
            .then(() => {
              return db.query({ reportName: "report", version: queryVersion });
            })
            .then((results) => {
              expect(results).to.have.length(1000);
              done();
            })
            .catch(done);
        });

        it("should have a maximum limit of 10,000", (done) => {
          const rows = Array(11000)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          database
            .client(table)
            .insert(rows)
            .then(() => {
              return db.query({
                reportName: "report",
                limit: 11000,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(10000);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should paginate on the page param", (done) => {
          const rows = Array(6)
            .fill(0)
            .map((val, index) => {
              return { report_name: "report", date: `2017-01-0${index + 1}` };
            });
          database
            .client(table)
            .insert(rows)
            .then(() => {
              return db.query({
                reportName: "report",
                limit: 3,
                page: 1,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(3);
              expect(results[0].date.toISOString()).to.match(/^2017-01-06/);
              expect(results[2].date.toISOString()).to.match(/^2017-01-04/);

              return db.query({
                reportName: "report",
                limit: 3,
                page: 2,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(3);
              expect(results[0].date.toISOString()).to.match(/^2017-01-03/);
              expect(results[2].date.toISOString()).to.match(/^2017-01-01/);
              done();
            })
            .catch(done);
        });
      });

      describe(".buildTimeQuery(before, after)", () => {
        it("should return an array containing true if no date params are present", () => {
          const result = db.buildTimeQuery(null, null);
          expect(result).to.deep.equal([true]);
        });

        it("should return a nested array a raw query string and an array of the dates if both a params are set", () => {
          const result = db.buildTimeQuery("2018-11-20", "2018-12-20");
          expect(result).to.deep.equal([
            '"date" <= ?::date AND "date" >= ?::date',
            ["2018-11-20", "2018-12-20"],
          ]);
        });

        it("should return a nested array a raw query string and an array of the before if before is set", () => {
          const result = db.buildTimeQuery("2018-11-20", null);
          expect(result).to.deep.equal(['"date" <= ?::date', ["2018-11-20"]]);
        });

        it("should return a nested array a raw query string and an array of the after if after is set", () => {
          const result = db.buildTimeQuery(null, "2018-11-22");
          expect(result).to.deep.equal(['"date" >= ?::date', ["2018-11-22"]]);
        });
      });

      describe(".queryDomain(params)", () => {
        it("should only return 2 results that include site reports from the test.gov domain", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-03",
                data: { domain: "test.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                2,
                1,
                null,
                null,
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when multiple reports", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "report",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-03",
                data: { domain: "test.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                null,
                null,
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when multiple domains", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-03",
                data: { domain: "usda.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                null,
                null,
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when before date parameters are in", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "usda.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                "2017-10-20",
                null,
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2017-01-02/);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 1 result that include site reports from the test.gov domain, when after date parameters are in", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "usda.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                null,
                "2017-10-20",
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(1);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2018-01-03/);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 2 result that include site reports from the test.gov domain, when after/before date parameters set", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-11-04",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-11-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "usda.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                "2018-01-02",
                "2017-10-20",
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2017-11-04/);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });

        it("should only return 2 result that include site reports from the test.gov domain, when after/before date parameters set", (done) => {
          database
            .client(table)
            .insert([
              {
                report_name: "site",
                date: "2017-01-02",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-01-01",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "report",
                date: "2018-01-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2017-11-03",
                data: { domain: "test.gov" },
              },
              {
                report_name: "site",
                date: "2018-01-03",
                data: { domain: "usda.gov" },
              },
            ])
            .then(() => {
              return db.queryDomain(
                "test.gov",
                "site",
                1000,
                1,
                "2018-01-04",
                "2017-10-20",
                table,
              );
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2018-01-03/);
              done();
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });
});
