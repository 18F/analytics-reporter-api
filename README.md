[![Code Climate](https://codeclimate.com/github/18F/analytics-reporter-api/badges/gpa.svg)](https://codeclimate.com/github/18F/analytics-reporter-api)  [![CircleCI](https://circleci.com/gh/18F/analytics-reporter-api.svg?style=shield)](https://circleci.com/gh/18F/analytics-reporter-api)

# Analytics API

A system for publishing data retrieved from the Google Analytics API by the
[Analytics Reporter](https://github.com/18F/analytics-reporter).
This Analytics API serves data written to a PostgreSQL database by the Analytics
Reporter, in response to HTTP requests.

This project's data is provided by the Analytics Reporter using the [Google Analytics Data API v1](https://developers.google.com/analytics/devguides/reporting/data/v1/rest).
The analytics data is processed into a flat data structure by the reporter and
stored in the database which is then served by this API.

The project previously used the [Google Analytics Core Reporting API v3](https://developers.google.com/analytics/devguides/reporting/core/v3/)
and the [Google Analytics Real Time API v3](https://developers.google.com/analytics/devguides/reporting/realtime/v3/),
also known as Universal Analytics,  which has slightly different data points.

Analytics API v1 serves the Universal Analytics data and Analytics API v2 serves
the new GA4 data. See [Migrating from API V1 to API V2](#migrating-from-api-v1-to-api-v2)
for more details. The Universal Analytics API will be deprecated on July 1, 2024
and the Analytics API v1 will no longer receive new data after that date.

## Setup

This Analytics API maintains the schema for the database that the
[Analytics Reporter](https://github.com/18F/analytics-reporter)
writes to. Thus, the Analytics API must be setup and
configured before the Analytics Reporter starts writing data.

### Prerequistites

* NodeJS > v20.x
* A postgres DB running

### Clone the code and install dependencies

```bash
git clone git@github.com:18F/analytics-reporter-api.git
cd analytics-reporter-api
npm install
```

### Linting

This repo uses Eslint and Prettier for code static analysis and formatting. Run
the linter with:

```bash
npm run lint
```

Automatically fix lint issues with:

```bash
npm run lint:fix
```

### Install git hooks

There are some git hooks provided in the `./hooks` directory to help with
common development tasks. These will checkout current NPM packages on branch
change events, and run the linter on pre-commit.

Install the provided hooks with the following command:

```bash
npm run install-git-hooks
```

### Running the unit tests

The unit tests for this repo require a local PostgreSQL database. You can run a
local DB server or create a docker container using the provided test compose
file. (Requires docker and docker-compose to be installed)

Starting a docker test DB:

```bash
docker-compose -f docker-compose.test.yml up
```

Once you have a PostgreSQL DB running locally, you can run the tests. The test
DB connection in knexfile.js has some default connection config which can be
overridden with environment variables.  If using the provided docker-compose DB
then you can avoid setting the connection details.

Run the tests (pre-test hook runs DB migrations):

```bash
npm test
```

#### Running the unit tests with code coverage reporting

If you wish to see a code coverage report after running the tests, use the
following command. This runs the DB migrations, tests, and the NYC code coverage
tool:

```bash
npm run coverage
```

### Run the application

Once the dependencies are installed, the app can be started.

```bash
npm start
```

The API should now be available at `http://localhost:4444/`

Note that the API will not render any data because the database is empty.
The [Analytics Reporter](https://github.com/18F/analytics-reporter)
can be configured to write to the same database and run with the
`--write-to-database` option in order to populate some records.

## Using the API

Full API docs can be found here: https://open.gsa.gov/api/dap/

### Environments

The base URLs for the 3 API envrionments:
  - development: https://api.gsa.gov/analytics/dap/develop/
  - staging: https://api.gsa.gov/analytics/dap/staging/
  - production: https://api.gsa.gov/analytics/dap/

### Overview

The Analytics API exposes 3 API endpoints:

- `/v{api_version}/reports/{report_name}/data`
- `/v{api_version}/agencies/{agency_name}/reports/{report_name}/data`
- `/v{api_version}/domain/{domain}/reports/{report_name}/data`

Each endpoint renders a JSON array with the most recent 1000 records that the
Analytics Reporter has generated for the given agency and report. If no records
are found, an empty array is returned.

Records are sorted according to the associated date.

#### Limit query parameter

If a different number of records is desired, the `limit` query parameter can be
set to specify the desired number of records.

```
/v2/reports/realtime/data?limit=500
```

The maximum number of records that can be rendered for any given request is
10,000.

#### Page query parameter

If the desired record does not appear for the current request, the `page` query
parameter can be used to get the next series of data points. Since the data is
ordered by date, this parameter effectively allows older data to be queried.

```
/v2/reports/realtime/data?page=2
```

## Migrating from API V1 to API V2

### Background

Analytics API V1 returns data from Google Analytics V3, also known as Universal
Analytics (UA).

Google is retiring UA and is encouraging users to move to their new
version Google Analytics V4 (GA4) in 2024.

Analytics API V2 returns data from GA4.

### Migration details

#### Requests

The Analytics API endpoints are the same between V1 and V2, the only difference
for API requests is the API version string.

#### Responses

Response data is slightly different in Analytics API V2.  This change is due to
the data provided by Google Analytics. Some data fields were retired in GA4, and
some other useful data fields were added. The changes follow:

##### Deprecated fields

- browser_version
- has_social_referral
- exits
- exit_page

##### New fields

###### bounce_rate

The percentage of sessions that were not engaged.  GA4 defines engaged as a
session that lasts longer than 10 seconds or has multiple pageviews.

###### file_name

The page path of a downloaded file.

###### language_code

The ISO639 language setting of the user's device.  e.g. 'en-us'

###### session_default_channel_group

An enum which describes the session. Possible values:

'Direct', 'Organic Search', 'Paid Social', 'Organic Social', 'Email',
'Affiliates', 'Referral', 'Paid Search', 'Video', and 'Display'

## Creating a new database migration
If you need to migrate the database, you can create a new migration via `knex`, which will create the migration file for you based in part on the migration name you provide. From the root of this repo, run:
```
`npm bin`/knex migrate:make <the name of your migration>
```

See [knex documentation](https://knexjs.org/#Installation-migrations) for more details.

## Running database migrations

### Locally

`npm run migrate`

### In production

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

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in
[CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
