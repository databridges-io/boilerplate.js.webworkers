const express = require('express');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = 4001;

app.use(express.static('public'));

// default Route
app.get('/', (req, res) => {
    res.redirect('mapSharedWorkerExample.html');
});

// default Route
app.get('/dedicatedworker', (req, res) => {
    res.redirect('mapDedicatedWorkerExample.html');
});

// Certificate Files for serving this service as HTTPS
// NOTE : To make sure google api's run properly you need to run the server in HTTPS mode.
https.createServer({
    key: fs.readFileSync("./cert/server.key"),
    cert: fs.readFileSync("./cert/server.crt"),
    ca: fs.readFileSync("./cert/ca.crt")
}, app).listen(PORT, '0.0.0.0', () => console.log(`Server Running at port ${PORT}`));


