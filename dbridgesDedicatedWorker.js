importScripts('https://cdn.socket.io/3.1.3/socket.io.min.js')
importScripts('https://cdn.jsdelivr.net/npm/databridges-sio-js-lib@2.0.2/dist/databridges.sio.lib.min.js')

// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
let dbridge = null;

let subsribedChannelsObjMap = {};

// Main frontend JS  to worker communication identities.
const workerEvent = {
    subscribe: 1,
    dbStatus: 11,
    dbLog: 12,
    event: 16
}

// Get access token when channel is private,presence  or system. Below example calls a REST endpoint /token to get the access token, You need to write your endpoint for getting the access token.
const getAccessToken = (payloadJson, res) => {
    fetch('/token', {
        method: 'POST',
        headers: {
            Accept: 'application.json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadJson)
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not OK');
        }
        return response.json();
    }).then(data => {
        res.end(data);
    }).catch(err => {
        postMessage({
            cmd: workerEvent.dbLog,
            msg: 'dataBridges getAccessToken exception..',
            err: err.source + ',' + err.code + ',' + err.message
        });
        res.end({
            statuscode: 1,
            error_message: error.message,
            accesskey: ''
        });
    });
}

const dbridgesConnect =() =>{
    postMessage({
        cmd: workerEvent.dbStatus,
        msg: 'Offline'
    });
    // lets create a sessionID
    const sessionID = Math.random().toString(36).substring(2, 7);
    // Include dataBridges client library package
    //const dBridges = require('databridges-sio-client-lib');
    // Initialize dataBridges client
    dbridge = new dbridges.dBridges();
    // Replace your application key below, which you have received from dataBridges management portal.
    // use environmental letiables for greater security of your keys
    dbridge.appkey = dbApplnKey;
    // Replace your authentication url below, which you have received from dataBridges management portal.
    // example https://endpoint01.databridges.io/client/v1/authenticate
    // use environmental letiables for greater security of your keys
    dbridge.auth_url = dbAuthURL;

    dbridge.access_token(async (channelName, sessionId, action, response) => {
        getAccessToken({ ch: channelName, sid: sessionId, dbappkey: dbApplnKey, act: action }, response, sessionID);
    });
    // Connect to dataBridges. If any runtime error it will be caught in catch().
    dbridge.connect().catch((err) => {
        if (err.source) {
            postMessage({
                cmd: workerEvent.dbLog,
                msg: 'dataBridges Connection exception..',
                err: err.source + ',' + err.code + ',' + err.message
            });
        }
    });
    //Bind to disconnected event, to get intimation about dataBridges network disconnection.
    dbridge.connectionstate.bind("disconnected", () => {
        postMessage({
            cmd: workerEvent.dbStatus,
            msg: 'Offline'
        });
        postMessage({
            cmd: workerEvent.dbLog,
            msg: 'Disconnected from dataBridges real-time network',
            err: ''
        });
    });
    //Bind to connected event, to get intimation about dataBridges network connection.
    dbridge.connectionstate.bind("connected", () => {
        postMessage({
            cmd: workerEvent.dbStatus,
            msg: 'Online'
        });
        postMessage({
            cmd: workerEvent.dbLog,
            msg: 'Connected to dataBridges real-time network !!!',
            err: ''
        });
    });
    postMessage({
        cmd: workerEvent.dbLog,
        msg: 'Worker started',
        err: ''
    });
}

dbridgesConnect();

// When message is received from frontend thread javascript code.
onmessage = function (event) {
    const eventData = event.data;
    onClientMessage(eventData);
}

// On Client Message from frontend Thread
const onClientMessage = (eventData) => {
    switch (eventData.cmd) {
        case workerEvent.subscribe:
            subscribeChannel(eventData.data.channel);
            break
        default:
            break
    }
}

// Subscribe to Channel
const subscribeChannel = (channelName) => {
    if (!(channelName in subsribedChannelsObjMap)) {
        try {
            const subChannel = dbridge.channel.subscribe(channelName)
            // Bind to Subscription success event
            subChannel.bind("dbridges:subscribe.success", (payload, metadata) => {
                subsribedChannelsObjMap[channelName] = subChannel;
                postMessage({
                    cmd: workerEvent.dbLog,
                    msg: 'Subscription success for channel:' + channelName,
                    err: ''
                });
            });
            // Bind to Subscription failure event
            subChannel.bind("dbridges:subscribe.fail", (payload, metadata) => {
                postMessage({
                    cmd: workerEvent.dbLog,
                    msg: 'Subscription failed for channel:' + channelName,
                    err: JSON.stringify(payload)
                });
            });

            // Bind to all events received and pass it on to frontend thread
            subChannel.bind_all((payload, metadata) => {
                if (metadata.eventname.substring(0,9) != 'dbridges:') {
                    postMessage({
                        cmd: workerEvent.event,
                        channelname: metadata.channelname,
                        eventname: metadata.eventname,
                        payload: payload,
                        metadata: metadata
                    });
                }
            });

            // Bind to unsubscription success event
            subChannel.bind("dbridges:unsubscribe.success", (payload, metadata) => {
                postMessage({
                    cmd: workerEvent.dbLog,
                    msg: 'UnSubscription success for channel:' + channelName,
                    err: ''
                });
                delete subsribedChannelsObjMap[channelName]

            });

            // Bind to unsubscription failure event
            subChannel.bind("dbridges:unsubscribe.fail", (payload, metadata) => {
                postMessage({
                    cmd: workerEvent.dbLog,
                    msg: 'UnSubscription failed for channel:' + channelName,
                    err: ''
                });
            });
        } catch (err) {
            postMessage({
                cmd: workerEvent.dbLog,
                msg: 'dataBridges Subscription exception..',
                err: err.source + ',' + err.code + ',' + err.message
            });
        }
    }
}


