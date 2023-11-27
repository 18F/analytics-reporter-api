#!/bin/bash
export NEW_RELIC_APP_NAME="analytics-reporter-api"
export NODE_ENV="test"
export PATH="$PATH:/home/vcap/deps/0/bin"
node deploy/cron.js

