const express = require("express");
const session = require("express-session");
const env = require("dotenv").config();
const passport = require("passport");
require("./config/passport");
const app = express();
const expressLayout = require("express-ejs-layouts");
const path = require("path");
const db = require("./config/db");
const userRouter = require("./routes/user.routes");
const adminRouter = require("./routes/admin.routes");
const sessionCheck = require("./middlewares/authMiddleware").sessionCheck;
db();
const errorController = require("./controllers/errorController");

app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60,
    },
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayout);
app.set("layout", false);
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use(sessionCheck);
app.use("/admin", adminRouter);
app.use("/", userRouter);
app.use((req, res) => {
  errorController.pageNotFound(req, res);
});

app.listen(process.env.PORT, () => {
  console.log("server is running");
});

module.exports = app;
