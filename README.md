[![Code Climate](https://codeclimate.com/github/18F/analytics-reporter-api/badges/gpa.svg)](https://codeclimate.com/github/18F/analytics-reporter-api)  [![CircleCI](https://circleci.com/gh/18F/analytics-reporter-api.svg?style=shield)](https://circleci.com/gh/18F/analytics-reporter-api)  [![Dependency Status](https://gemnasium.com/badges/github.com/18F/analytics-reporter-api.svg)](https://gemnasium.com/github.com/18F/analytics-reporter-api)



# Analytics API

A system for publishing data retrieved from the Google Analytics API by the
[Analytics Reporter](https://github.com/18F/analytics-reporter). The analytics
API serves data written to a Progress database by the Analytics Reporter in
response to HTTP requests.

# Setup

The Analytics API maintains the schema for the database that the Analytics
Reporter writes to. Because of this, the Analytics API must be setup and
configured before the Analytics Reporter starts writing data.

First, the database needs to be created:

```shell
createdb analytics-reporter
```

Once the database is created, the app can be cloned and the dependencies can be
installed via NPM. The install script has a postinstall hook that will migrate
the database.

```shell
git clone git@github.com:18F/analytics-reporter-api.git
cd analytics-reporter-api
npm install
```

Once all of the dependencies are installed, the app can be started.

```shell
npm start
```

The API is not available at `http://localhost:4444/`

Note that the API will not render any data until Analytics Reporter is
configured to write to the same database and run with the `--write-to-database`
option.

# Using the API

The Analytics API exposes 3 API endpoints:

- `/reports/:report_name/data`
- `/agencies/:agency_name/reports/:reportName/data`
- `/domain/:domain/reports/:reportName/data`

Each endpoint renders a JSON array with the most recent 1000 records the
Analytics Reporter has generated for the given agency and report. If no records
are found, an empty array is returned.

Records are sorted according to the associated date.

##### Limit

If a different number of records is desired, the `limit` query parameter can be
set to specify the desired number of records.

```
/reports/realtime/data?limit=500
```

The maximum number of records that can be rendered for any given request is
10,000.

##### Page

If the desired record does not appear for the current request, the `page` query
parameter can be used to get the next series of data points. Since the data is
ordered by date, this parameter effectively allows older data to be queried.

```
/reports/realtime/data?page=2
```

# Running the Tests

The Analytics API application is backed by a test suite that uses
[Mocha](https://mochajs.org/) to run tests.

Before running the test suite, a database for the tests will need to be created.

```shell
createdb analytics-api-test
```

Then the tests can be invoked via NPM. The test script has a pretest hook that
migrates the database.

```
npm test
```

### Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in
[CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
