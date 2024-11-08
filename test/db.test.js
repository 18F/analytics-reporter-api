const expect = require("chai").expect;
const proxyquire = require("proxyquire");
const database = require("./support/db");

const db = proxyquire("../src/db", {
  "./config": require("../src/config"),
});

describe("db", () => {
  const apiVersions = ["v1.1", "v2"];

  before(async () => {
    // Setup the test database client
    await database.createClient();
  });

  after(async () => {
    // Clean up the test database client and the application database client
    await database.destroyClient().then(() => {
      return db.dbClient.destroy();
    });
  });

  apiVersions.forEach((apiVersion) => {
    describe(`for API version ${apiVersion}`, () => {
      const table =
        apiVersion === "v1.1" ? "analytics_data" : "analytics_data_ga4";
      const queryVersion = apiVersion === `v1.1` ? "1.1" : "2";

      beforeEach(async () => {
        await database.resetSchema(table);
      });

      describe(".query(params)", () => {
        it("should return all rows for the given agency and report", async () => {
          await database
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
            });
        });

        it("should return all rows without an agency if no agency name is given", async () => {
          await database
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
            });
        });

        it("should sort the rows according to the date column", async () => {
          await database
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
            });
        });

        it("should limit the rows according to the limit param", async () => {
          const rows = Array(5)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          await database
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
            });
        });

        it("should default to a limit of 1000", async () => {
          const rows = Array(1001)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          await database
            .client(table)
            .insert(rows)
            .then(() => {
              return db.query({ reportName: "report", version: queryVersion });
            })
            .then((results) => {
              expect(results).to.have.length(1000);
            });
        });

        it("should have a maximum limit of 10,000", async () => {
          const rows = Array(11000)
            .fill(0)
            .map(() => {
              return { report_name: "report", date: "2017-01-01" };
            });
          await database
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
            });
        });

        it("should paginate on the page param", async () => {
          const rows = Array(6)
            .fill(0)
            .map((val, index) => {
              return { report_name: "report", date: `2017-01-0${index + 1}` };
            });
          await database
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
            });
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
        it("should only return 2 results that include site reports from the test.gov domain", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 2,
                page: 1,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when multiple reports", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when multiple domains", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
            });
        });

        it("should only return 4 results that include download reports from the test.gov domain, when multiple domains", async () => {
          const testData = [
            {
              report_name: "download",
              date: "2017-01-02",
              data: { page: "www.test.gov" },
            },
            {
              report_name: "download",
              date: "2017-01-02",
              data: { page: "test.gov" },
            },
            {
              report_name: "download",
              date: "2017-01-01",
              data: { page: "test.gov/example" },
            },
            {
              report_name: "download",
              date: "2017-01-01",
              data: { page: "www.test.gov/example" },
            },
            {
              report_name: "download",
              date: "2017-01-03",
              data: { page: "usda.gov" },
            },
          ];
          await database
            .client(table)
            .insert(testData)
            .then(() => {
              return db.query({
                domain: "test.gov",
                reportName: "download",
                limit: 1000,
                page: 1,
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(4);
              results.forEach((resultItem, index) => {
                expect(resultItem.report_name).to.equal(
                  testData[index].report_name,
                );
                expect(resultItem.data.page).to.equal(
                  testData[index].data.page,
                );
              });
            });
        });

        it("should only return 2 results that include site reports from the test.gov domain, when before date parameters are in", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                before: "2017-10-20",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2017-01-02/);
            });
        });

        it("should only return 1 result that include site reports from the test.gov domain, when after date parameters are in", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                after: "2017-10-20",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(1);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2018-01-03/);
            });
        });

        it("should only return 2 result that include site reports from the test.gov domain, when after/before date parameters set", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                before: "2018-01-02",
                after: "2017-10-20",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2017-11-04/);
            });
        });

        it("should only return 2 result that include site reports from the test.gov domain, when after/before date parameters set", async () => {
          await database
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
              return db.query({
                domain: "test.gov",
                reportName: "site",
                limit: 1000,
                page: 1,
                before: "2018-01-04",
                after: "2017-10-20",
                version: queryVersion,
              });
            })
            .then((results) => {
              expect(results).to.have.length(2);
              expect(results[0].report_name).to.equal("site");
              expect(results[0].data.domain).to.equal("test.gov");
              expect(results[0].date.toISOString()).to.match(/^2018-01-03/);
            });
        });
      });
    });
  });
});
