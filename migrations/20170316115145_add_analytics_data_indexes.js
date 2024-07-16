/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.up = function (knex) {
  return knex.schema
    .table("analytics_data", (table) => {
      table.index(["report_name", "report_agency"]);
    })
    .then(() => {
      return knex.schema.raw(
        "CREATE INDEX analytics_data_date_time_desc ON analytics_data (date_time DESC NULLS LAST)",
      );
    });
};

/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.down = function (knex) {
  return knex.schema.table("analytics_data", (table) => {
    table.dropIndex(["report_name", "report_agency"]);
    table.dropIndex("date_time", "analytics_data_date_time_desc");
  });
};
