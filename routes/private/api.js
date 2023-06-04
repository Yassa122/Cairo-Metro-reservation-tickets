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
  //prices:Check Price 
  //working
  app.get("/api/v1/tickets/price/:originId/:destinationId", async function (req, res) {
    try {
      const { originId, destinationId } = req.params;
      console.log("Origin ID:", originId);
      console.log("Destination ID:", destinationId);
      
      const origin = await db
        .select("*")
        .from("se_project.stations")
        .where("id", originId)
        .first();
      if (!origin) {
        return res.status(400).send("Origin not found");
      }
      
      const destination = await db
        .select("*")
        .from("se_project.stations")
        .where("id", destinationId)
        .first();
      if (!destination) {
        return res.status(400).send("Destination not found");
      }
      
      // Find routes with up to 4 transfer stations
      const query = `
        SELECT r1.*, 
               COUNT(*) - 1 AS transferStations 
        FROM se_project.routes AS r1
        INNER JOIN se_project.routes AS r2 ON r1.tostationid = r2.fromstationid
        INNER JOIN se_project.routes AS r3 ON r2.tostationid = r3.fromstationid
        INNER JOIN se_project.routes AS r4 ON r3.tostationid = r4.fromstationid
        WHERE r1.fromstationid = ? AND r4.tostationid = ?
        GROUP BY r1.id
      `;
      
      console.log("SQL Query:", query);
      
      const routes = await db.raw(query, [originId, destinationId]);
      
      if (!routes || routes.length === 0) {
        return res.status(400).send("No routes found");
      }
      
      // Calculate price based on number of transfer stations
      const basePrice = 10; // Adjust this to your desired base price
      const transferStationRate = 5; // Adjust this to your desired rate per transfer station
      
      let price = null;
      
      for (const route of routes) {
        const totalPrice = basePrice + (route.transferStations * transferStationRate);
        price = {
          routeId: route.id,
          totalPrice: totalPrice
        };
        break; // Only consider the first valid route found
      }
      
      if (!price) {
        return res.status(400).send("Price not found");
      }
      
      // Apply discount for seniors
      const isSenior = req.query.senior === "true";
      if (isSenior) {
        const discount = 0.25; // 25% discount for seniors
        price.totalPrice *= (1 - discount);
      }
      
      return res.status(200).json(price);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get price");
    }
  });
  
  
  
  
  
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
  //Accept/Reject Senior Request
  //working
  app.put("/api/v1/requests/senior/:requestId", async function (req, res) {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const parsedRequestId = parseInt(requestId, 10);
      if (isNaN(parsedRequestId)) {
        return res.status(400).send("Invalid requestId");
      }
  
      const seniorRequest = await db
        .select("*")
        .from("se_project.senior_requests")
        .where("id", parsedRequestId)
        .first();
  
      if (!seniorRequest) {
        return res.status(400).send("Senior request not found");
      }
  
      const updatedSeniorRequest = await db
        .update({ status })
        .from("se_project.senior_requests")
        .where("id", parsedRequestId)
        .returning("*")
        .then((rows) => rows[0]);
  
      return res.status(200).json(updatedSeniorRequest);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not update senior request");
    }
  });
  
  app.post("/api/v1/payment/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Unauthorized");
      }
  
      const { creditCardNumber, holderName, payedAmount, subType, zoneId } = req.body;
  
      // Validate input
      if (!creditCardNumber || !holderName || !payedAmount || !subType || !zoneId) {
        return res.status(400).send("Missing required fields");
      }
  
      const paymentId = v4();
  
      let noOfTickets;
      switch (subType) {
        case 'annual':
          noOfTickets = 100;
          break;
        case 'quarterly':
          noOfTickets = 50;
          break;
        case 'monthly':
          noOfTickets = 10;
          break;
        default:
          return res.status(400).send("Invalid subscription type");
      }
  
      // Insert into subscription table
      const subscriptionId = await db("se_project.subscription")
        .insert({
          subtype: subType,
          zoneid: zoneId,
          userid: user.userid,
          nooftickets: noOfTickets
        })
        .returning('id');
  
      // Insert into transactions table
      await db("se_project.transactions")
        .insert({
          // id: paymentId,
          amount: payedAmount,
          userid: user.userid,
          purchasediid: subscriptionId[0] // Use the subscription id as the purchased id
        });
  
      return res.status(201).json({ message: "Payment successful", paymentId });
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error processing payment");
    }
  });
  
}
