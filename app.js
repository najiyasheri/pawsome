const express=require('express')
const session=require('express-session')
const env=require('dotenv').config()
const passport = require("passport");
require("./config/passport");
const app=express()
const expressLayout=require('express-ejs-layouts')
const path=require('path')
const db=require('./config/db')
const userRouter=require('./routes/user.routes')
const adminRouter=require('./routes/admin.routes')


db()



app.use(session({
    secret:process.env.SESSION_KEY,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        maxAge:1000*60*60
    }
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname,'public')))
app.use(expressLayout)
app.set("layout", false);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.set("layout", "layouts/adminLayout");  
// app.set("layout", "layouts/userLayout");


app.use('/admin',adminRouter)
app.use('/',userRouter)



app.listen(process.env.PORT,()=>{
    console.log('server is running')
}) 

module.exports=app