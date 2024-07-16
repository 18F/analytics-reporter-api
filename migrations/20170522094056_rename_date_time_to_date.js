/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.up = function (knex) {
  return knex.schema
    .raw("ALTER TABLE analytics_data RENAME COLUMN date_time TO date")
    .then(() => {
      return knex.schema.raw(
        "ALTER TABLE analytics_data ALTER COLUMN date TYPE date",
      );
    });
};

/**
 * @param {import("knex").Knex} knex the instance of knex
 * @returns {Promise<void>} resolves or rejects when the SQL statement completes
 */
exports.down = function (knex) {
  return knex.schema
    .raw("ALTER TABLE analytics_data RENAME COLUMN date TO date_time")
    .then(() => {
      return knex.schema.raw(
        "ALTER TABLE analytics_data ALTER COLUMN date_time TYPE timestamp with time zone",
      );
    });
};
