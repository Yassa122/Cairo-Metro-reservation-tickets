
const db = require('../../connectors/db');

module.exports = function(app) {
  //Register HTTP endpoint to render /index page
  app.get('/', function(req, res) {
    return res.render('index');
  });
// example of passing variables with a page
  app.get('/register', async function(req, res) {
    const stations = await db.select('*').from('se_project.stations');
    return res.render('register', { stations });
  });
  app.get('/requestId', async function(req, res) {
    const stations = await db.select('*').from('se_project.stations');
    return res.render('register', { stations });
  });
  app.get('/requestRefund', async function(req, res) {
    const tickets = await db.select('*').from('se_project.tickets');
    return res.render('requestRefund', { tickets });
  });
  app.get('/requestSenior', async function(req, res) {

    return res.render('requestSenior');
  });
};
