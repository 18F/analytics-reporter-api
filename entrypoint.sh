#!/bin/bash
export NEW_RELIC_APP_NAME="analytics-reporter-api"
export PATH="$PATH:/home/vcap/deps/0/bin"
npm run migrate
npm start
