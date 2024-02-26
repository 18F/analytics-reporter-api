const knex = require("knex");
const config = require("../../src/config");

class Database {
  get client() {
    return this.dbClient;
  }

  async createClient() {
    if (this.dbClient) {
      return;
    }

    this.dbClient = await knex({ client: "pg", connection: config.postgres });
  }

  async destroyClient() {
    if (this.dbClient) {
      await this.dbClient.destroy();
      this.dbClient = null;
    }

    return;
  }

  resetSchema(table) {
    return this.dbClient(table).delete();
  }
}

module.exports = new Database();
