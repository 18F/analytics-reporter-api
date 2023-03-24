const knex = require('knex');
const config = require('../../src/config');

const db = knex({ client: 'pg', connection: config.postgres });

const resetSchema = () => {
  return db('analytics_data').delete();
};

module.exports = { db, config, resetSchema };