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

const handleIfApiVersionNotice = (apiVersion, arr) => {
  if (apiVersion === "v1.1") {
    return arr.map((object) => {
      return { ...object, notice: noticeValue };
    });
  }
  return arr;
};

const apiVersions = ["v1.1", "v2"];

const invalidDates = [
  "2020-00-00",
  "2024-14-01",
  "2025-01-33",
  "2020/01/02",
  "20202-01-01",
  "2020-010-01",
  "2020-01-010",
  "343542",
  "junk",
];

const invalidPositiveIntegers = [-1, 0, 33.33, "foobar", "foo4bar", "4foobar"];

const invalidPageNumbers = [...invalidPositiveIntegers, 10001];

describe("app", () => {
  let url;

  beforeEach(() => {
    url = "";
  });

  apiVersions.forEach((apiVersion) => {
    describe(`with api version: ${apiVersion}`, () => {
      beforeEach(() => {
        db.query = () => Promise.resolve();
      });

      describe("and with route: /reports/:reportName/data", () => {
        beforeEach(() => {
          url = `/${apiVersion}/reports/fake-report/data`;
        });

        describe("when params are valid", () => {
          it("should not pass the agency param if the request does not specify an agency", async () => {
            db.query = (params) => {
              expect(params.reportAgency).to.be.undefined;
              expect(params.reportName).to.equal("fake-report");
              const arr = handleIfApiVersionNotice(apiVersion, [
                { id: 1, date: new Date("2017-01-01") },
                { id: 2, date: new Date("2017-01-02") },
              ]);
              return Promise.resolve(arr);
            };

            const dataRequest = request(app)
              .get(`/${apiVersion}/reports/fake-report/data`)
              .expect(200);

            await dataRequest.then((actualResponse) => {
              const expectedResponseBody = handleIfApiVersionNotice(
                apiVersion,
                [
                  { id: 1, date: "2017-01-01" },
                  { id: 2, date: "2017-01-02" },
                ],
              );
              expect(actualResponse.body).to.deep.equal(expectedResponseBody);
            });
          });
        });

        describe("when params are invalid", () => {
          describe("and the before param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?before=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the after param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?after=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the page param is not a valid positive integer", () => {
            invalidPositiveIntegers.forEach((invalidPositiveInteger) => {
              describe(`and page is ${invalidPositiveInteger}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?page=${invalidPositiveInteger}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the limit param is not a valid positive integer with max 10000", () => {
            invalidPageNumbers.forEach((invalidPageNumber) => {
              describe(`and page is ${invalidPageNumber}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?limit=${invalidPageNumber}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });
        });
      });

      describe("and with route: /agencies/:agency/reports/:reportName/data", () => {
        beforeEach(() => {
          url = `/${apiVersion}/agencies/fake-agency/reports/fake-report/data`;
        });

        describe("and params are valid", () => {
          it("should pass params from the url to db.query and render the result", async () => {
            db.query = (params) => {
              expect(params.reportAgency).to.equal("fake-agency");
              expect(params.reportName).to.equal("fake-report");
              const arr = handleIfApiVersionNotice(apiVersion, [
                { id: 1, date: new Date("2017-01-01") },
                { id: 2, date: new Date("2017-01-02") },
              ]);
              return Promise.resolve(arr);
            };

            const dataRequest = request(app).get(url).expect(200);

            await dataRequest.then((actualResponse) => {
              const expectedResponseBody = handleIfApiVersionNotice(
                apiVersion,
                [
                  { id: 1, date: "2017-01-01" },
                  { id: 2, date: "2017-01-02" },
                ],
              );
              expect(actualResponse.body).to.deep.equal(expectedResponseBody);
            });
          });

          it("should merge the params in the url with query params", async () => {
            db.query = (params) => {
              expect(params.reportAgency).to.equal("fake-agency");
              expect(params.reportName).to.equal("fake-report");
              expect(params.limit).to.equal("50");
              const arr = handleIfApiVersionNotice(apiVersion, [
                { id: 1, date: new Date("2017-01-01") },
                { id: 2, date: new Date("2017-01-02") },
              ]);
              return Promise.resolve(arr);
            };

            const dataRequest = request(app).get(`${url}?limit=50`).expect(200);

            await dataRequest.then((actualResponse) => {
              const expectedResponseBody = handleIfApiVersionNotice(
                apiVersion,
                [
                  { id: 1, date: "2017-01-01" },
                  { id: 2, date: "2017-01-02" },
                ],
              );
              expect(actualResponse.body).to.deep.equal(expectedResponseBody);
            });
          });

          it("should respond with a 500 if db.query rejects", async () => {
            db.query = () =>
              Promise.reject(
                "This is a test of the emergency broadcast system.",
              );

            const dataRequest = request(app)
              .get(
                `/${apiVersion}/agencies/fake-agency/reports/fake-report/data`,
              )
              .expect(500);

            await dataRequest.then((actualResponse) => {
              const expectedResponseBody = {
                message:
                  "An error occurred. Please check the application logs.",
                status: 500,
              };
              expect(actualResponse.body).to.deep.equal(expectedResponseBody);
            });
          });
        });

        describe("and params are invalid", () => {
          describe("and the before param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?before=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the after param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?after=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the page param is not a valid positive integer", () => {
            invalidPositiveIntegers.forEach((invalidPositiveInteger) => {
              describe(`and page is ${invalidPositiveInteger}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?page=${invalidPositiveInteger}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the limit param is not a valid positive integer with max 10000", () => {
            invalidPageNumbers.forEach((invalidPageNumber) => {
              describe(`and page is ${invalidPageNumber}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?limit=${invalidPageNumber}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });
        });
      });

      describe("and with route: /domain/:domain/reports/:reportName/data", () => {
        const allowedDomainReports = [
          "site",
          "domain",
          "download",
          "second-level-domain",
        ];

        beforeEach(() => {
          url = `/${apiVersion}/domain/example.gov/reports/site/data`;
        });

        describe("and params are valid", () => {
          allowedDomainReports.forEach((reportName) => {
            describe(`and the report name is ${reportName}`, () => {
              beforeEach(() => {
                url = `/${apiVersion}/domain/example.gov/reports/${reportName}/data`;

                db.query = (params) => {
                  expect(params.domain).to.equal("example.gov");
                  expect(params.reportName).to.equal(reportName);
                  const arr = handleIfApiVersionNotice(apiVersion, [
                    {
                      id: 1,
                      date: new Date("2017-01-01"),
                      report_name: reportName,
                      data: { domain: "example.gov" },
                    },
                  ]);
                  return Promise.resolve(arr);
                };
              });

              it(`should pass params from the url to db.query and render the result`, async () => {
                const dataRequest = request(app).get(url).expect(200);

                await dataRequest.then((actualResponse) => {
                  const expectedResponseBody = handleIfApiVersionNotice(
                    apiVersion,
                    [
                      {
                        id: 1,
                        date: "2017-01-01",
                        report_name: reportName,
                        domain: "example.gov",
                      },
                    ],
                  );
                  expect(actualResponse.body).to.deep.equal(
                    expectedResponseBody,
                  );
                });
              });
            });
          });
        });

        describe("and params are invalid", () => {
          it("should respond with a 400 if the domain report is not one of the acceptable kinds of reports", async () => {
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
              .get(`/${apiVersion}/domain/fakeiscool.gov/reports/browser/data`)
              .expect(400);

            await dataRequest.then((actualResponse) => {
              const expectedResponseBody = {
                message:
                  "You are requesting a report that cannot be filtered on domain. Please try one of the following reports: site, domain, download, second-level-domain.",
                status: 400,
              };
              expect(actualResponse.body).to.deep.equal(expectedResponseBody);
            });
          });

          describe("and the before param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?before=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the after param is not a valid date", () => {
            invalidDates.forEach((invalidDate) => {
              describe(`and date is ${invalidDate}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?after=${invalidDate}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      message:
                        "Invalid request params: ValidationError: must be a date in format 'YYYY-MM-DD'",
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.equal(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the page param is not a valid positive integer", () => {
            invalidPositiveIntegers.forEach((invalidPositiveInteger) => {
              describe(`and page is ${invalidPositiveInteger}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?page=${invalidPositiveInteger}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });

          describe("and the limit param is not a valid positive integer with max 10000", () => {
            invalidPageNumbers.forEach((invalidPageNumber) => {
              describe(`and page is ${invalidPageNumber}`, () => {
                it("should respond with a 400", async () => {
                  const apiRequest = request(app)
                    .get(`${url}?limit=${invalidPageNumber}`)
                    .expect(400);

                  await apiRequest.then((actualResponse) => {
                    const expectedResponseBody = {
                      status: 400,
                    };
                    expect(actualResponse.body).to.deep.include(
                      expectedResponseBody,
                    );
                  });
                });
              });
            });
          });
        });
      });

      describe(`with unsupported version`, () => {
        beforeEach(() => {
          db.query = () => Promise.resolve();
        });

        it("should not accept unsupported versions", async () => {
          const unsupportedVersion = "v2.x";

          db.query = (params) => {
            expect(params.reportAgency).to.equal("fake-agency");
            expect(params.reportName).to.equal("fake-report");
            const arr = handleIfApiVersionNotice(unsupportedVersion, [
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

          await dataRequest.then((actualResponse) => {
            const expectedResponse = {
              _body: expectedErrorMessage,
              status: 404,
            };
            expect(actualResponse).to.include(expectedResponse);
          });
        });
      });
    });
  });
});
