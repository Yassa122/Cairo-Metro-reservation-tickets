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
  // PUT /api/v1/requests/senior/:requestId
app.put('/api/v1/requests/senior/', (req, res) => {
  const { requestId } = req.params;
  const { seniorStatus } = req.body;

  // Handle acceptance
  if (seniorStatus === 'accepted') {
    // Perform actions for accepting the request
    // Update the request status in the database accordingly

    return res.status(200).json({ message: 'Request accepted successfully' });
  }

  // Handle rejection
  if (seniorStatus === 'rejected') {
    // Perform actions for rejecting the request
    // Update the request status in the database accordingly

    return res.status(200).json({ message: 'Request rejected successfully' });
  }

  // Invalid seniorStatus value
  return res.status(400).json({ message: 'Invalid seniorStatus value' });
});

// PUT /api/v1/requests/refunds/:requestId
app.put('/api/v1/requests/refunds/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { refundStatus } = req.body;

  if (refundStatus === 'accepted') {
    // Perform actions for accepting the refund request
    // Update the refund request status in the database accordingly

    return res.status(200).json({ message: 'Refund request accepted successfully', redirect: '/' });
  }

  if (refundStatus === 'rejected') {
    // Perform actions for rejecting the refund request
    // Update the refund request status in the database accordingly

    return res.status(200).json({ message: 'Refund request rejected successfully', redirect: '/' });
  }

  return res.status(400).json({ message: 'Invalid refundStatus value' });
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
