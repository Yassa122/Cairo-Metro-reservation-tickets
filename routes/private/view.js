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
    if(user.isAdmin){
      return res.render('admindashboard', user);
    }
    else{
      return res.render('dashboard', user);
    }
  
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });

  // Register HTTP endpoint to render /courses page
  app.get('/stations_example', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });
  app.get('/resetPassword', async function(req, res) {
    const user = await getUser(req);
    return res.render('resetPassword', user);
});

app.get('/subscriptions', async function(req, res) {
  const user = await getUser(req);
  return res.render('subscriptions', user);
});

app.get('/subscriptions', async function(req, res) {
  const user = await getUser(req);
  return res.render('subscriptions', user);
});

app.get('/requestsRefund', async function(req, res) {
  const user = await getUser(req);
  return res.render('requestsRefund', user);
});

app.get('/request/senior', async function(req, res) {
  const user = await getUser(req);
  return res.render('request/senior', user);
});



app.get('/ticketsSubscriptions', async function(req, res) {
  const user = await getUser(req);
  return res.render('ticketsSubscriptions', user);
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

app.get('/manage/stations', async function(req, res) {
  const user = await getUser(req);
  return res.render('manage/stations', user);
});

app.get('/manage/routes', async function(req, res) {
  const user = await getUser(req);
  return res.render('manage/routes', user);
});
app.get('/price', async function(req, res) {
  const user = await getUser(req);
  return res.render('price', user);
});

app.get('/requestRefund', async function(req, res) {
  const tickets = await db.select('*').from('se_project.tickets');
  return res.render('requestRefund', { tickets });
});
app.get('/requestSenior', async function(req, res) {

  return res.render('requestSenior');
});
app.get('/admindashboard', async function(req, res) {
  const user = await getUser(req);
  return res.render('admindashboard', user);
});

app.get('/manage/zones', async function(req, res) {
  const user = await getUser(req);
  return res.render('manage/zones', user);
});
app.get('/manage/refundReq', async function(req, res) {
  const user = await getUser(req);
  return res.render('manage/refundReq', user);
});

app.get('/manage/seniorReq', async function(req, res) {
  const user = await getUser(req);
  return res.render('manage/seniorReq', user);
});

app.get('/price', async function(req, res) {
  const user = await getUser(req);
  return res.render('price', user);
});

app.get('/refunds', async function(req, res) {
  const user = await getUser(req);
  return res.render('refunds', user);
});
app.get('/manageZones', async function(req, res) {
  const user = await getUser(req);
  return res.render('manageZones', user);
});

app.get('/refundTickets', async function(req, res) {
  const user = await getUser(req);
  return res.render('refundTickets', user);
});

app.get('/viewTickets', async function(req, res) {
  const user = await getUser(req);
  return res.render('viewTickets', user);
});

app.get('/simulateRide', async function(req, res) {
  const user = await getUser(req);
  return res.render('simulateRide', user);
});

app.get('/viewSubscriptions', async function(req, res) {
  const user = await getUser(req);
  return res.render('viewSubscriptions', user);
});

app.get('/purchaseTicketSubscription', async function(req, res) {
  const user = await getUser(req);
  return res.render('purchaseTicketSubscription', user);
});

};