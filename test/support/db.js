const knex = require('knex');
const config = require('../../src/config');

const client = knex({ client: 'pg', connection: config.postgres });

const resetSchema = (table) => {
  return client(table).delete();
};

module.exports = { client, config, resetSchema };
