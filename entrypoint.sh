#!/bin/sh
#Set Postgres env vars from VCAP_SERVICES
export POSTGRES_DATABASE=$(echo $VCAP_SERVICES | jq -r '."aws-rds"[].credentials.db_name')
export POSTGRES_HOST=$(echo $VCAP_SERVICES | jq -r '."aws-rds"[].credentials.host')
export POSTGRES_PASSWORD=$(echo $VCAP_SERVICES | jq -r '."aws-rds"[].credentials.password')
export POSTGRES_USER=$(echo $VCAP_SERVICES | jq -r '."aws-rds"[].credentials.username')


#This line will get sed replaced based on the environment/branch
export NEW_RELIC_APP_NAME="analytics-reporter-api"
export NODE_ENV="test"
