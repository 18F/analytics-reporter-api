/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.up = function (knex) {
  return knex.schema.createTable("analytics_data", (table) => {
    table.increments("id");
    table.string("report_name");
    table.string("report_agency");
    table.dateTime("date_time");
    table.jsonb("data");
    table.timestamps(true, true);
  });
};

/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.down = function (knex) {
  return knex.schema.dropTable("analytics_data");
};
