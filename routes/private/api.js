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
    const user = await db("se_project.users").insert(newUser).returning("*");

    return res.status(200).json(user);
    const zones = await db.select("*").from("se_project.zones");
    return res.status(200).json(zones);
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not register user");
    return res.status(400).send("Could not get zones");
  }
});
  
  

app.post("/api/v1/payment/subscription", async function(req, res) {
  const { purchasedId, creditCardNumber, holderName, payedAmount, subType, zoneId } = req.body;
  
  // Validation of request data
  if (!purchasedId || !creditCardNumber || !holderName || !payedAmount || !subType || !zoneId) {
      return res.status(400).json({ message: "All fields are required!" });
  }
  
  // Here you may want to include additional checks to ensure that creditCardNumber is a valid card number,
  // holderName matches the name on the card, and payedAmount is a positive integer.
  // Similarly, check if the subType is a valid subscription type and zoneId is a valid zone.

  try {
      // Inserting transaction
      await db('se_project.transactions').insert({
          amount: payedAmount,
          userid: purchasedId, // assuming purchasedId is the user's id
          purchasediid: 'subscription' // since it's a subscription
      });

      // Finding the zone price
      const zone = await db('se_project.zones').where('id', zoneId).first();
      if (!zone) throw new Error("Invalid zone id");

      // Calculating the number of tickets
      let nooftickets = 0;
      switch (subType) {
          case 'annual':
              nooftickets = 100;
              break;
          case 'quarterly':
              nooftickets = 50;
              break;
          case 'monthly':
              nooftickets = 10;
              break;
          default:
              throw new Error("Invalid subscription type");
      }

      // Check if the payment is sufficient for the chosen subscription type
      if (zone.price > payedAmount) throw new Error("Insufficient payment");

      // Inserting the subscription
      await db('se_project.subsription').insert({
          subtype: subType,
          zoneid: zoneId,
          userid: purchasedId,
          nooftickets: nooftickets
      });

      return res.status(200).json({ message: "Subscription purchased successfully!" });

  } catch (e) {
      console.log(e.message);
      return res.status(400).send("Error purchasing subscription");
  }
});



app.post("/api/v1/refund/:ticketId", async function (req, res) {
  console.log("i am hereeee");
  try {
    const user = await getUser(req);
    const { ticketId } = req.params;
    console.log(ticketId);
    // Retrieve the ticket from the database
    const ticket = await db
      .select("*")
      .from("se_project.tickets")
      .where("id", ticketId)
      .first();

    console.log(ticket);
    if (!ticket) {
      return res.status(404).send("Ticket not found");
    }

    // Check if the ticket belongs to the requesting user
    if (ticket.userid !== user.id) {
      return res.status(403).send("Access denied");
    }

    // Check if the ticket is a future dated ticket
    const now = new Date();
    const ticketDate = new Date(ticket.tripdate);
    if (ticketDate.getTime() <= now.getTime()) {
      return res.status(400).send("Cannot refund past dated tickets");
    }

    // Perform the refund process here...
    // Update the ticket status, calculate refund amount, etc.
    // For example:
    console.log("here subid ",ticket.subid);
    const subscription = await db
      .select("*")
      .from("se_project.subsription")
      .where("id", ticket.subid)
      .first()
    console.log(subscription);

    if (subscription != null) {
      const newNoOfTickets = subscription.nooftickets + 1;
      await db("se_project.subsription")
        .select("*")  
        .where("id", ticket.subid)
        .update({
          nooftickets: newNoOfTickets,
        });
    }
    else{
      // do the online logic
    }


    await db
      .from("se_project.tickets")
      .where("id", ticketId)
      .del();


    // Return success response
    return res.status(200).send("Ticket refunded successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not process ticket refund");
  }
});


};

  



//   
