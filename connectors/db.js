// import the knex library that will allow us to
// construct SQL statements
const knex = require('knex');

// define the configuration settings to connect
// to our local postgres server
const config = {
  client: 'pg',
  connection: {
    host: "dpg-ci1u7cm7avj2t31rc5p0-a.oregon-postgres.render.com",
    port: "5432",
    user: "se_project_06lv_user",
    password: "5c8jBV5EpJRoFrlRYH1hZvUAf6bli813",
    database: "se_project_06lv",
    ssl: true
  },
};
//qw
// create the connection with postgres
const db = knex(config);

// expose the created connection so we can
// use it in other files to make sql statements
module.exports = db;
