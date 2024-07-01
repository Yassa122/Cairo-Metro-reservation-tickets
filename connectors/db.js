// import the knex library that will allow us to
// construct SQL statements
const knex = require('knex');

// define the configuration settings to connect
// to our local postgres server
const localConfig = {
  client: 'pg',
  connection: {
    host: "localhost",
    port: "5432",
    user: "postgres", // Replace with your PostgreSQL username
    password: "newpassword", // Replace with your PostgreSQL password
    database: "se_project", // Replace with your PostgreSQL database name
    ssl: false // SSL is not typically used for local development
  },
};


// define the configuration settings to connect
// to our local postgres server
// const config = {
//   client: 'pg',
//   connection: {
//     host: "dpg-cka04s7s0fgc738a1kfg-a.oregon-postgres.render.com",
//     port: "5432",
//     user: "db_sxf5_user",
//     password: "fxRgS73JEStI1tJS3EEBqZe4iZsTHGQO",
//     database: "db_sxf5",
//     ssl: true
//   },
// };
// create the connection with postgres
const db = knex(localConfig);
// Test the connection
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  })
// expose the created connection so we can
// use it in other files to make sql statements
module.exports = db;
