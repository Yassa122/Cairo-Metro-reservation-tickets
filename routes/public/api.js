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
  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });
  app.post("/api/v1/payment/subscription", async function (req, res) {
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
      const subscription = await stripe.subscriptions.create({
        customer: customer.stripeid,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
      });
      return res.status(200).json(subscription);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create subscription");
    }
  });
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
}
