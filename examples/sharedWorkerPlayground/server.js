const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');

const app = express();
const PORT = 4000;
// Replace your dataBrdiges Application Key and Application Secret below.
const dbApplnKey = 'app_key';
const dbApplnSecret = 'app_secret';

// Set session parameters
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

//sample username and password database
const userDb = {
    user1: 'mypassword',
    user2: 'mypassword',
    user3: 'mypassword',
    user4: 'mypassword'
}

// dataBridge Token Validation and Accesskey generation logic.
const trustToken = (req, res, next) => {
    const clientAppKey = dbApplnKey;
    const clientAppSecret = dbApplnSecret;
    console.log(req.body);
    const inJson = req.body;
    const userId = req.session.userid;
    if (!userId) {
        res.status(200).send({
            statuscode: 1,
            error_message: "Authentication failed",
            accesskey: ""
        });
        return false
    }
    if (clientAppKey == inJson.dbappkey) {
        const appSecrt = clientAppSecret;
        const channelName = inJson.ch;
        let signPayLoad = {
            sid: inJson.sid,
            cname: channelName,
            pub: true,
            conn_info: {}
        };
        if (channelName.indexOf("prs:") == 0) {
            signPayLoad.conn_info = { sysid: userId, sysinfo: {} };
        }
        if (channelName.indexOf("sys:") == 0) {
            signPayLoad.conn_info = { sysid: userId, sysinfo: {} };
        }
        const accesskey = jwt.sign(signPayLoad, appSecrt);
        res.status(200).send({
            statuscode: 0,
            error_message: "",
            accesskey: accesskey
        });
    } else {
        res.status(200).send({
            statuscode: 1,
            error_message: "Authentication failed",
            accesskey: ""
        });
    }
};

// default Route
app.get('/', (req, res) => {
    let session = req.session;
    if (session.userid) {
        res.redirect('sharedWorkerExample.html');
    } else
        res.sendFile('index.html')
});

// Authentication route
app.post('/user', (req, res) => {
    if (req.body.username in userDb) {
        if (userDb[req.body.username] == req.body.password) {
            let session = req.session;
            session.userid = req.body.username;
            res.redirect('sharedWorkerExample.html')
        } else {
            res.send('Invalid username or password');
        }
    } else {
        res.send('Invalid username or password');
    }
})
// Token Validation and Accesskey generation route
app.post('/token', (req, res) => {
    trustToken(req, res)
})
// Logout route for clearing sessions.
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));
