/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.up = function (knex) {
  return knex.schema.raw(
    "CREATE INDEX analytics_data_date_desc_id_asc ON analytics_data (date DESC NULLS LAST, id ASC)",
  );
};

/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.down = function (knex) {
  return knex.schema.table("analytics_data", (table) => {
    table.dropIndex("analytics_data_date_desc_id_asc");
  });
};
