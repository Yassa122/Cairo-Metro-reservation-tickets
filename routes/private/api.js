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
 
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const user = await getUser(req);
      const { newpassword } = req.body;
      await db("se_project.users")
        .where("id", user.userid)
        .update({ password: newpassword });
      return res.status(200).json("Your new password is: " + newpassword);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("error updating password");
    }
  });

  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select('*').from("se_project.zones");
      return res.status(200).json(zones);
    }   catch (e) {
      console.log(e.message);
      return res.status(500).send("Error retrieving zones data");
    }
  });

  app.post("/api/v1/payment/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Unauthorized");
      }

      const { purchasedId, creditCardNumber, holderName, payedAmount, subType, zoneId } = req.body;

      if (isEmpty(purchasedId) || isEmpty(creditCardNumber) || isEmpty(holderName) || isEmpty(payedAmount) || isEmpty(subType) || isEmpty(zoneId)) {
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
      const subscriptionId = await db("se_project.subsription")
        .insert({
          subtype: subType,
          zoneid: zoneId,
          userid: user.id,
          nooftickets: noOfTickets
        })
        .returning('id');

      // Insert into transactions table
      await db("se_project.transactions")
        .insert({
          id: paymentId,
          amount: payedAmount,
          userid: user.id,
          purchasedid: subscriptionId[0] // Use the subscription id as the purchased id
        });

      return res.status(201).json({ message: "Payment successful", paymentId });
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error processing payment");
    }
  });

  app.post("/api/v1/payment/ticket", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Unauthorized");
      }
  
      const { purchasedId, creditCardNumber, holderName, payedAmount, origin, destination, tripDate } = req.body;
  
      if (isEmpty(purchasedId) || isEmpty(creditCardNumber) || isEmpty(holderName) || isEmpty(payedAmount) || isEmpty(origin) || isEmpty(destination) || isEmpty(tripDate)) {
        return res.status(400).send("Missing required fields");
      }
  
      // Check if the user has a valid subscription
      const subscription = await db
        .select("*")
        .from("se_project.subsription")
        .where("userid", user.id)
        .andWhere("nooftickets", ">", 0)
        .first();
  
      if (!subscription) {
        return res.status(400).send("No valid subscription found");
      }
  
      // Deduct one ticket from the subscription
      await db("se_project.subsription")
        .where("id", subscription.id)
        .update({
          nooftickets: subscription.nooftickets - 1
        });
  
      // Insert into tickets table
      const ticketId = await db("se_project.tickets")
        .insert({
          origin: origin,
          destination: destination,
          userid: user.id,
          subid: subscription.id,
          tripdate: tripDate
        })
        .returning('id');
  
      // Insert into rides table
      await db("se_project.rides")
        .insert({
          status: "upcoming",
          origin: origin,
          destination: destination,
          userid: user.id,
          ticketid: ticketId[0],
          tripdate: tripDate
        });
  
      return res.status(201).json({ message: "Ticket purchased successfully through subscription" });
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error processing payment");
    }
  });

  app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      if (!user) {
        return res.status(401).send("Unauthorized");
      }
  
      const { subId, origin, destination, tripDate } = req.body;
  
      if (isEmpty(subId) || isEmpty(origin) || isEmpty(destination) || isEmpty(tripDate)) {
        return res.status(400).send("Missing required fields");
      }
  
      // Check if the user has a valid subscription
      const subscription = await db
        .select("*")
        .from("se_project.subsription")
        .where("id", subId)
        .andWhere("userid", user.id)
        .andWhere("nooftickets", ">", 0)
        .first();
  
      if (!subscription) {
        return res.status(400).send("No valid subscription found");
      }
  
      // Deduct one ticket from the subscription
      await db("se_project.subsription")
        .where("id", subscription.id)
        .update({
          nooftickets: subscription.nooftickets - 1
        });
  
      // Insert into tickets table
      const ticketId = await db("se_project.tickets")
        .insert({
          origin: origin,
          destination: destination,
          userid: user.id,
          subid: subscription.id,
          tripdate: tripDate
        })
        .returning('id');
  
      // Insert into rides table
      await db("se_project.rides")
        .insert({
          status: "upcoming",
          origin: origin,
          destination: destination,
          userid: user.id,
          ticketid: ticketId[0],
          tripdate: tripDate
        });
  
      return res.status(201).json({ message: "Ticket purchased successfully through subscription" });
    } catch (e) {
      console.log(e.message);
      return res.status(500).send("Error processing payment");
    }
  });
  
  
};