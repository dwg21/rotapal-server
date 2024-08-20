const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { checkAndCreateRotas, checkRotasExpired } = require("./scheduler");
require("dotenv").config();

const app = express();

// Define the CORS options
app.use(cors({ credentials: true, origin: "http://127.0.0.1:5173" }));

app.use(express.json());

checkAndCreateRotas();
checkRotasExpired();

const connectDB = (url) => {
  return mongoose.connect(url);
};

// rest of packages
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

//router
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const venueRouter = require("./routes/venueRoutes");
const rotaRouter = require("./routes/rotaRoutes");
const notficationRouter = require("./routes/notficationRoutes");
const swapRouter = require("./routes/swapRoutes");
const holidayRouter = require("./routes/holidayRoutes");
const employeeRouter = require("./routes/employeeRoutes.js");

//middleware
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

app.use(morgan("tiny"));
app.use(express.json()); //logs each request to the console
app.use(cookieParser(process.env.JWT_SECRET));

//route initilsiation
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/venue", venueRouter);
app.use("/api/v1/employee", employeeRouter);
app.use("/api/v1/rotas", rotaRouter);
app.use("/api/v1/notifcations", notficationRouter);
app.use("/api/v1/swap", swapRouter);
app.use("/api/v1/holidays", holidayRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
