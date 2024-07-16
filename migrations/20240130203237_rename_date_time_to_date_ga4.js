/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.up = function (knex) {
  return knex.schema.raw(
    "ALTER TABLE analytics_data_ga4 ALTER COLUMN date TYPE date",
  );
};

/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.down = function (knex) {
  return knex.schema.raw(
    "ALTER TABLE analytics_data_ga4 ALTER COLUMN date TYPE timestamp with time zone",
  );
};
