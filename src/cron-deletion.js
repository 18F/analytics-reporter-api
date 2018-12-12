const Cron = require('cron');
const knex = require('knex');
const moment = require('moment');
const config = require('./config');
const db = knex({ client: 'pg', connection: config.postgres });
const logger = require('./logger');

const deleteOldEntries = (monthsAgo) => {
  const before = moment().subtract(monthsAgo, 'months').format('YYYY-MM-DD');
  logger.info(`About to delete records from before ${before}`);
  const timeQuery = ['"date" <= ?::date', [before]];
  return db('analytics_data')
      .whereRaw(...timeQuery)
      .del()
      .then(res => logger.info(`Deleted ${res} records as part of monthly historical data cleanup`));
};

// schedule tasks to be run on the server
const cronJob = (monthsAgo) => {
  return new Cron.CronJob('0 0 12 1 1/1 ? *', () => {
    console.log('---------------------');
    console.log('Running Cron Job');
    deleteOldEntries(monthsAgo);
  });
};

module.exports = { deleteOldEntries, cronJob };

