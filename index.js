const express = require("express");
const app = express();
const port = 8080;
const User = require("./models/User");
const Report = require("./models/Report");
const RealReport = require("./models/RealReport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(
  cors({
    origin: ["http://localhost:3000","http://localhost:3001"],
    credentials: true,
  })
);
app.use(bodyParser.json());

mongoose
  .connect(
    "mongodb+srv://jessica:jessica1234@studio.unqrc9l.mongodb.net/?retryWrites=true&w=majority&appName=Studio"
  )
  .then(() => console.log("Connected to DB"))
  .catch((e) => console.error("DB connection error", e));

app.use("/", (req, res) => {
  res.json("Hello World");
});  

app.post("/register", async (req, res) => {
  const { username, email, password, phone, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    username,
    email,
    password: hashedPassword,
    phone,
    role,
  });
  await user.save();
  res.json({ status: "ok" });
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ status: "error", error: "Invalid email/password" });
      return;
    }
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        "secret"
      );
      res.json({
        status: "ok",
        token: token,
        role: user.role,
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      });
    } else {
      res.json({ status: "error", error: "Invalid email/password" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ status: "error from catcgh block", error: error.message });
  }
});

app.post("/sendrequest", async (req, res) => {
  try {
    const { author, title, desc, type } = req.body;
    const report = new Report({ author, title, desc, type });
    const savedReport = await report.save();
    res.status(201).json({ status: "success", data: savedReport });
  } catch (error) {
    console.error(error); // Log the error for debugging
    if (error.code === 11000) {
      res.status(400).json({
        status: "error",
        message: "Duplicate key error",
        details: error.message,
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
});

app.get("/getreports", async (req, res) => {
  // Assuming the username is passed as a query parameter.
  // Alternatively, if you're using JWT tokens, you'd extract the username from the token.
  const { author } = req.query;

  if (!username) {
    return res
      .status(400)
      .json({ status: "error", message: "Username is required" });
  }

  try {
    const reports = await Report.find({ author: author });
    if (reports.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No reports found for this user" });
    }
    res.json({ status: "success", data: reports });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ status: "ok", data: users });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/getallrequests", async (req, res) => {
  try {
    const requests = await Report.find({ AssignTo: "anyone" });
    res.json({ status: "ok", data: requests });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/getallengineers", async (req, res) => {
  try {
    const engineers = await User.find({ role: "engineer" });
    res.json({ status: "ok", data: engineers });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.post("/assignrequest", async (req, res) => {
  const { engineerUsername, requestId } = req.body;

  try {
    const updatedReport = await Report.findByIdAndUpdate(
      requestId,
      {
        $set: { AssignTo: engineerUsername },
      },
      { new: true }
    ); // `new: true` returns the updated document

    if (updatedReport) {
      res.status(200).json({ status: "success", data: updatedReport });
    } else {
      res.status(404).json({ status: "error", message: "Request not found" });
    }
  } catch (error) {
    console.error("Error updating request", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/getassignedrequest", async (req, res) => {
  const { name } = req.query; // Now using req.query instead of req.body
  try {
    const AssignedRequest = await Report.find({ AssignTo: name , status:"Pending"});
    res.status(200).json({ status: "success", data: AssignedRequest });
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
});

app.post("/createreport", async (req, res) => {
    try {
      const {
        Engineer,
        FacilityName,
        EquipmentName,
        SerialNumber,
        modelNumber,
        ProblemDesc,
        WorkDone,
        FurtherWorks,
        FurtherWorkDesc,
        type,
        requestId,
      } = req.body;
      
      // Create the report
      const thereport = new RealReport({
        Engineer,
        FacilityName,
        EquipmentName,
        SerialNumber,
        modelNumber,
        ProblemDesc,
        WorkDone,
        FurtherWorks,
        FurtherWorkDesc,
        type,
        requestId,
      });
      const realReport = await thereport.save();
  
      // Update the request status if requestId is provided
      let updateResult = {};
      if (requestId) {
        updateResult = await Report.updateOne(
          { _id: requestId },
          { $set: { status: "done" } }
        );
      }
  
      // Send a single response indicating the report creation
      // and optionally the update operation result
      res.status(201).json({ 
        status: "success", 
        data: realReport, 
        updateResult: requestId ? updateResult : undefined
      });
    } catch (error) {
      console.error(error); // Log the error for debugging
      if (error.code === 11000) {
        res.status(400).json({
          status: "error",
          message: "Duplicate key error",
          details: error.message,
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Internal Server Error",
          error: error.message,
        });
      }
    }
});

app.get('/getcreatedreports',async(req,res)=>{
  const {name}= req.query;
  try {
    const CreatedReport = await RealReport.find({ Engineer: name});
    res.status(200).json({ status: "success", data: CreatedReport});
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/getallreports', async (req,res)=>{
  try {
    const AllReports = await RealReport.find();
    res.status(200).json({status:"success",data: AllReports})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/getmyrequest', async (req,res) => {
  const {author} = req.query;
  console.log(author);
  try {
    const myRequests = await Report.find({author:author})
    res.status(200).json({status:"ok",data:myRequests})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})



{/*routes for dashoard counts*/}

app.get('/getcompletedtasks', async (req,res) => {
  try {
    const completedTasks = await Report.find({status:"done"});
    res.status(200).json({status:"ok",data:completedTasks.length})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/getuncompletedtasks', async (req,res) => {
  try {
    const completedTasks = await Report.find({status:"Pending"});
    res.status(200).json({status:"ok",data:completedTasks.length})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/getallreportscount', async (req,res)=>{
  try {
    const AllReports = await RealReport.find();
    res.status(200).json({status:"success",data: AllReports.length})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/getallrequestscount', async (req,res)=>{
  try {
    const AllReports = await Report.find();
    res.status(200).json({status:"success",data: AllReports.length})
  } catch (error) {
    console.error(error); // Logging the error to the console
    res
      .status(500)
      .json({ status: "internal server error", message: error.message });
  }
})

app.get('/reports-today', async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const count = await Report.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report count', error: error.message });
  }
});

app.get('/request-counts-last-10-days', async (req, res) => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);

  try {
    const reportCounts = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: tenDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            type: "$type",
            day: { $dayOfYear: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.day": 1 }
      }
    ]);

    res.json(reportCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report counts for the last 10 days', error: error.message });
  }
});

app.get('/report-counts-last-10-days', async (req, res) => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);

  try {
    const reportCounts = await RealReport.aggregate([
      {
        $match: {
          createdAt: { $gte: tenDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            type: "$type",
            day: { $dayOfYear: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.day": 1 }
      }
    ]);

    res.json(reportCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report counts for the last 10 days', error: error.message });
  }
});

app.get('/monthly-report-counts', async (req, res) => {
  try {
    const monthlyCounts = await Report.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }},
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.month": 1 }
      }
    ]);

    const transformedData = monthlyCounts.map(item => ({
      month: item._id.month,
      count: item.count
    }));

    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly report counts', error: error.message });
  }
});
  
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
