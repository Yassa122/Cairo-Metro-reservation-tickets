const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
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

module.exports = function (app) {
  // example
  //Register
  app.post("/api/v1/users", async function (req, res) {
    try {
      const { firstName, lastName, email, password } = req.body;
      const user = await db
        .insert({
          firstName,
          lastName,
          email,
          password,
        })
        .into("se_project.users")
        .returning("*")
        .then((rows) => rows[0]);
      return res.status(200).json(user);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create user");
    }
  });
  
  //subscriptions:Get Zones Data
  //working
  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });
  //subscriptions:Pay for subscription online
  //not working
  app.post("/api/v1/subscription", async function (req, res) {
    try {
      const {
        subtype,
        zoneid,
        userid,
        nooftickets
      } = req.body;
  
      if (!subtype || !zoneid || !userid || !nooftickets) {
        return res.status(400).send("All fields are required.");
      }
  
      const subscription = await db("se_project.subscription")
        .insert({
          subtype,
          zoneid,
          userid,
          nooftickets
        })
        .returning("*")
        .then((rows) => rows[0]);
  
      return res.status(201).json(subscription);
    } catch (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }
  });
  

      


  //tickets:Pay for ticket online
  app.post("/api/v1/payment/ticket", async function (req, res) {
    try {
      const user = await getUser(req);
      const { paymentMethodId, priceId } = req.body;
      const customer = await db
        .select("*")
        .from("se_project.customers")
        .where("userid", user.id)
        .first();
      if (!customer) {
        return res.status(400).send("Customer not found");
      }
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customer.stripeid,
        payment_method: paymentMethodId,
        amount: 1000,
        currency: "EGP",
        confirmation_method: "manual",
        confirm: true,
      });
      return res.status(200).json(paymentIntent);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create payment intent");
    }
  });
  //tickets:Pay for ticket by subscription
  app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      const { subscriptionId } = req.body;
      const customer = await db
        .select("*")
        .from("se_project.customers")
        .where("userid", user.id)
        .first();
      if (!customer) {
        return res.status(400).send("Customer not found");
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) {
        return res.status(400).send("Subscription not found");
      }
      const ticket = await db
        .insert({
          id: v4(),
          userid: user.id,
          subscriptionid: subscription.id,
          status: "active",
          createdat: new Date(),
          updatedat: new Date(),
        })
        .into("se_project.tickets")
        .returning("*")
        .then((rows) => rows[0]);
      return res.status(200).json(ticket);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not purchase subscription");
    }
  });
  //prices:Check Price 
  //working
  app.get("/api/v1/tickets/price/:originId & :destinationId", async function (req, res) {
    try {
      const { originId, destinationId } = req.params;
      const origin = await db
        .select("*")
        .from("se_project.zones")
        .where("id", originId)
        .first();
      if (!origin) {
        return res.status(400).send("Origin not found");
      }
      const destination = await db
        .select("*")
        .from("se_project.zones")
        .where("id", destinationId)
        .first();
      if (!destination) {
        return res.status(400).send("Destination not found");
      }
      const price = await db

        .select("*")
        .from("se_project.prices")
        .where("originid", originId)
        .andWhere("destinationid", destinationId)
        .first();
      if (!price) {
        return res.status(400).send("Price not found");
      }
      return res.status(200).json(price);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get price");
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
  app.get("/api/v1/tickets", async function (req, res) {
    try {
      const user = await getUser(req);
      const tickets = await db
        .select("*")
        .from("se_project.tickets")
        .where("userid", user.id);
      return res.status(200).json(tickets);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get tickets");
    }
  }
  );
  //senior request:request for senior role
  //working
  app.post("/api/v1/senior/request", async function (req, res) {
    try {
      const user = await getUser(req);
      const nationalId = req.body.nationalId;
      const seniorRequest = await db
        .insert({
          status: "pending",
          userid: user.id,
          nationalid: nationalId 
        })
        .into("se_project.senior_requests")
        .returning("*")
        .then((rows) => rows[0]);
  
      res.status(201).send(seniorRequest);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while creating the senior request.");
    }
  });
};
  
