// import the knex library that will allow us to
// construct SQL statements
const knex = require('knex');

// define the configuration settings to connect
// to our local postgres server
const config = {
  client: 'pg',
  connection: {
    host: "dpg-cka04s7s0fgc738a1kfg-a.oregon-postgres.render.com",
    port: "5432",
    user: "db_sxf5_user",
    password: "fxRgS73JEStI1tJS3EEBqZe4iZsTHGQO",
    database: "db_sxf5",
    ssl: true
  },
};
//qw
// create the connection with postgres
const db = knex(config);

// expose the created connection so we can
// use it in other files to make sql statements
module.exports = db;
