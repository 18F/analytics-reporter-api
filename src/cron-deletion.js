const Cron = require('cron');
const knex = require('knex');
const moment = require('moment');
const config = require('./config');
const db = knex({ client: 'pg', connection: config.postgres });
const logger = require('./logger');

const cronDeletion = {};

cronDeletion.deleteOldEntries = (monthsAgo) => {
  console.log('got it');
  const before = moment().subtract(monthsAgo, 'months').format('YYYY-MM-DD');
  logger.info(`About to delete records from before ${before}`);
  const timeQuery = ['"date" <= ?::date', [before]];
  return db('analytics_data')
      .whereRaw(...timeQuery)
      .del()
      .then(res => logger.info(`Deleted ${res} records as part of monthly historical data cleanup.`));
};

// schedule tasks to be run on the server
cronDeletion.cronJob = (monthsAgo) => {
  return new Cron.CronJob('0 0 2 1 * *', () => {
    console.log('---------------------');
    console.log('Running Cron Job');
    cronDeletion.deleteOldEntries(monthsAgo);
  });
};

module.exports = cronDeletion;

