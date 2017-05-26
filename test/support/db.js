const knex = require('knex');
const config = require('../../src/config');

const client = knex({ client: 'pg', connection: config.postgres });

const resetSchema = () => {
  return client('analytics_data').delete();
};

module.exports = { client, config, resetSchema };
