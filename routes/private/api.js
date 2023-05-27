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
  
  
  
}
