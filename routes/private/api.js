const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  const http = require('http');

const payForTicket = (ticketData) => {
  const options = {
    hostname: 'localhost', // Replace with the appropriate hostname
    port: 8000, // Replace with the appropriate port number
    path: '/api/v1/payment/ticket',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Payment successful:', responseData);
      } else {
        console.error('Payment failed:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.write(JSON.stringify(ticketData));
  req.end();
};

// Example ticket data
const ticketData = {
  purchasedId: 12345, // Integer
  creditCardNumber: 1234567890123456, // Integer
  holderName: 'John Doe', // String
  payedAmount: 100, // Integer
  origin: 'New York', // String
  destination: 'Los Angeles', // String
  tripDate: '2023-05-22T10:00:00', // DateTime
};

payForTicket(ticketData);
  app.get("/api", async function (req, res) {
    try {
      const user = await getUser(req);
      return res.status(200).json({ message: "Hello World!" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });
  const http = require('http');

const payForTicketBySubscription = (subscriptionData) => {
  const options = {
    hostname: 'localhost', // Replace with the appropriate hostname
    port: 8000, // Replace with the appropriate port number
    path: '/api/v1/tickets/purchase/subscription',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Payment successful:', responseData);
      } else {
        console.error('Payment failed:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.write(JSON.stringify(subscriptionData));
  req.end();
};

// Example subscription data
const subscriptionData = {
  subId: 12345, // Integer
  origin: 'New York', // String
  destination: 'Los Angeles', // String
  tripDate: '2023-05-22T10:00:00', // DateTime
};

payForTicketBySubscription(subscriptionData);
  app.get("/api", async function (req, res) {
    try {
      const user = await getUser(req);
      return res.status(200).json({ message: "Hello World!" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });
  const http = require('http');

const checkTicketPrice = (originId, destinationId) => {
  const options = {
    hostname: 'localhost', // Replace with the appropriate hostname
    port: 8000, // Replace with the appropriate port number
    path: `/api/v1/tickets/price/${originId}&${destinationId}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Ticket price:', responseData);
      } else {
        console.error('Failed to check ticket price:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.end();
};

// Example originId and destinationId
const originId = 123; // Integer: Replace with the actual origin ID
const destinationId = 456; // Integer: Replace with the actual destination ID

checkTicketPrice(originId, destinationId);
  app.get("/api", async function (req, res) {
    try {
      const user = await getUser(req);
      return res.status(200).json({ message: "Hello World!" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });
 


  
};
