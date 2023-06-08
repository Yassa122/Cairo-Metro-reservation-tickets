const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function(req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();
  
  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;  
}

module.exports = function(app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function(req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });

  // Register HTTP endpoint to render /courses page
  app.get('/stations', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });

  app.get('/subscriptions', async function(req, res) {
    const user = await getUser(req);
    return res.render('subscriptions', user);
  });

  app.get('/createStations', async function(req, res) {
    const user = await getUser(req);
    return res.render('createStations', user);
  });
  app.get('/updateStations', async function(req, res) {
    const user = await getUser(req);
    return res.render('updateStations', user);
  });

  app.get('/createRoute', async function(req, res) {
    const user = await getUser(req);
    return res.render('createRoute', user);
  });

  app.get('/updateRoute', async function(req, res) {
    const user = await getUser(req);
    return res.render('updateRoute', user);
  });

  app.get('/deleteStations', async function(req, res) {
    const user = await getUser(req);
    return res.render('deleteStations', user);
  });

  app.get('/deleteRoute', async function(req, res) {
    const user = await getUser(req);
    return res.render('deleteRoute', user);
  });

  app.get('/getStations', async function(req, res) {
    const user = await getUser(req);
    return res.render('getStations', user);
  });

  app.get('/getRoute', async function(req, res) {
    const user = await getUser(req);
    return res.render('getRoute', user);
  });

};