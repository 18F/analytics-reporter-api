[![Code Climate](https://codeclimate.com/github/18F/analytics-reporter-api/badges/gpa.svg)](https://codeclimate.com/github/18F/analytics-reporter-api)  [![CircleCI](https://circleci.com/gh/18F/analytics-reporter-api.svg?style=shield)](https://circleci.com/gh/18F/analytics-reporter-api)  [![Dependency Status](https://gemnasium.com/badges/github.com/18F/analytics-reporter-api.svg)](https://gemnasium.com/github.com/18F/analytics-reporter-api)



# Analytics API

A system for publishing data retrieved from the Google Analytics API by the
[Analytics Reporter](https://github.com/18F/analytics-reporter).
This Analytics API serves data written to a PostgreSQL database by the Analytics Reporter,
in response to HTTP requests.

# Setup

This Analytics API maintains the schema for the database that the
[Analytics Reporter](https://github.com/18F/analytics-reporter)
writes to. Thus, the Analytics API must be setup and
configured before the Analytics Reporter starts writing data.

First, create the database:

```shell
createdb analytics-reporter
```

````bash
export NODE_ENV=development # developing locally
````

Once the database is created, clone the app and install the dependencies via NPM.
The install script has a postinstall hook that will migrate
the database.

```shell
git clone git@github.com:18F/analytics-reporter-api.git
cd analytics-reporter-api
npm install
```

Once the dependencies are installed, the app can be started.

```shell
npm start
```

The API should now be available at `http://localhost:4444/`

Note that the API will not render any data until
[Analytics Reporter](https://github.com/18F/analytics-reporter)
is configured to write to the same database and run with the `--write-to-database` option.

# Using the API

The Analytics API exposes 3 API endpoints:
include version in the request, ie `/v1.1/`

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

# Creating a new database migration
If you need to migrate the database, you can create a new migration via `knex`, which will create the migration file for you based in part on the migration name you provide. From the root of this repo, run:
```
`npm bin`/knex migrate:make <the name of your migration>
```

See [knex documentation](https://knexjs.org/#Installation-migrations) for more details.

# Running database migrations

## Locally

`npm run migrate`

## In production

In production, you can run database migrations via `cf run-task`. As with anything in production, be careful when doing this! First, try checking the current status of migrations using the `migrate:status` command

```
cf run-task analytics-reporter-api --command "knex migrate:status" --name check_migration_status
```

This will kick off a task - you can see the output by running:

```
cf logs analytics-reporter-api --recent
# the output will look something like...
2021-07-19T14:31:39.89-0400 [APP/TASK/check_migration_status/0] OUT Using environment: production
2021-07-19T14:31:40.16-0400 [APP/TASK/check_migration_status/0] OUT Found 3 Completed Migration file/files.
2021-07-19T14:31:40.16-0400 [APP/TASK/check_migration_status/0] OUT 20170308164751_create_analytics_data.js
2021-07-19T14:31:40.16-0400 [APP/TASK/check_migration_status/0] OUT 20170316115145_add_analytics_data_indexes.js
2021-07-19T14:31:40.16-0400 [APP/TASK/check_migration_status/0] OUT 20170522094056_rename_date_time_to_date.js
2021-07-19T14:31:40.16-0400 [APP/TASK/check_migration_status/0] OUT No Pending Migration files Found.
2021-07-19T14:31:40.17-0400 [APP/TASK/check_migration_status/0] OUT Exit status 0
```

To actually run the migration, you would run:

```
cf run-task analytics-reporter-api --command "knex migrate:latest" --name run_db_migrations
```

See [knex documentation](https://knexjs.org/#Installation-migrations) for more details and options on the `migrate` command.
### Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in
[CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
