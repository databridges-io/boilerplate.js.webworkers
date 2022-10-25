importScripts('https://cdn.socket.io/3.1.3/socket.io.min.js')
importScripts('https://cdn.jsdelivr.net/npm/databridges-sio-js-lib@2.0.2/dist/databridges.sio.lib.min.js')

// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
let dbridge = null;

// Object holding all the browser instance objects for communication.
let clients = {};
// Object holding relation between browser instance objects and subscibed channel.
let browserTabChannelsMap = {};
// Object holding dataBridges subsciption object.
let subsribedChannelsObjMap = {};

// Main frontend JS  to worker communication identities.
const workerEvents = {
    subscribe: 1,
    publish: 2,
    unsubscribe: 3,
    channelList: 4,
    closing: 5,
    dbStatus: 11,
    dbLog: 12,
    clientLength: 13,
    session: 15,
    event: 16,
    logout: 17
}

// Get access token when channel is private,presence  or system. Below example calls a REST endpoint /token to get the access token, You need to write your endpoint for getting the access token.
const getAccessToken = (payloadJson, res, clientSessionId) => {
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
        clients[clientSessionId].postMessage({
            cmd: workerEvents.dbLog,
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

// Event fired when shared worker is started.
onconnect = function (event) {
    const port = event.ports[0];
    port.postMessage({
        cmd: workerEvents.dbStatus,
        msg: 'Offline'
    });
    // lets create a sessionID
    const sessionID = Math.random().toString(36).substring(2, 7);

    // Connect to databridges only once and share  it across all workers.
    if (Object.keys(clients).length == 0) {
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
                port.postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'dataBridges Connection exception..',
                    err: err.source + ',' + err.code + ',' + err.message
                });
            }
        });
        //Bind to disconnected event, to get intimation about dataBridges network disconnection.
        dbridge.connectionstate.bind("disconnected", () => {
            const clientList = Object.keys(clients);
            for (let i = 0; i < clientList.length; i++) {
                clients[clientList[i]].postMessage({
                    cmd: workerEvents.dbStatus,
                    msg: 'Offline'
                });
                clients[clientList[i]].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'Disconnected from dataBridges real-time network',
                    err: ''
                });
                clients[clientList[i]].postMessage({
                    cmd: workerEvents.logout,
                    msg: '',
                    err: ''
                });
            }
            // Do cleanup on disconnection.
            clients = {};
            browserTabChannelsMap = {};
            subsribedChannelsObjMap = {};
        });
        //Bind to connected event, to get intimation about dataBridges network connection.
        dbridge.connectionstate.bind("connected", () => {
            port.postMessage({
                cmd: workerEvents.dbStatus,
                msg: 'Online'
            });
            port.postMessage({
                cmd: workerEvents.dbLog,
                msg: 'Connected to dataBridges real-time network !!!',
                err: ''
            });
        });
        clients[sessionID] = port;
        port.postMessage({
            cmd: workerEvents.session,
            data: sessionID
        });
        port.postMessage({
            cmd: workerEvents.dbLog,
            msg: 'Shared worker started, Session id :' + sessionID,
            err: ''
        });
        sendClientLength();
    } else {
        // If Shared worker is already started, Put the port entry into clients object and send session id back to browser connection.
        // Send connected client dataBridges connection status.
        if (dbridge.connectionstate.isconnected) {
            port.postMessage({
                cmd: workerEvents.dbStatus,
                msg: 'Online'
            });
        }
        clients[sessionID] = port;
        port.postMessage({
            cmd: workerEvents.session,
            data: sessionID
        });
        port.postMessage({
            cmd: workerEvents.dbLog,
            msg: 'Shared worker connected, Session id :' + sessionID,
            err: ''
        });
        sendClientLength();
    }
    port.onmessage = function (event) {
        const eventData = event.data;
        const clientSessionId = eventData.sessionid;
        onClientMessage(clientSessionId, eventData)
    }
};

// On Client Message from frontend Thread
const onClientMessage = (clientSessionId, eventData) => {
    switch (eventData.cmd) {
        case workerEvents.subscribe:
            subscribeChannel(clientSessionId, eventData.data.channel);
            break
        case workerEvents.publish:
            publishToChannel(clientSessionId, eventData.data.channel, eventData.data.event, eventData.data.payload);
            break
        case workerEvents.unsubscribe:
            unSubscribeChannel(clientSessionId, eventData.data.channel)
            break
        case workerEvents.channelList:
            getChannelList(clientSessionId)
            break
        case workerEvents.logout:
            dbridge.disconnect();
            break
        case workerEvents.closing:
            for (const [key, value] of Object.entries(browserTabChannelsMap)) {
                if (value.includes(clientSessionId)) {
                    unSubscribeChannel(clientSessionId, key)
                }
            }
            delete clients[clientSessionId];
            sendClientLength();
            break
        default:
            break
    }
}

// Send client length to all ports
const sendClientLength = () => {
    const clientList = Object.keys(clients);
    for (let i = 0; i < clientList.length; i++) {
        clients[clientList[i]].postMessage({
            cmd: workerEvents.clientLength,
            msg: Object.keys(clients).length
        });
    }
}

// Get Subscribed channel list.
const getChannelList = (clientSessionId) => {
    let channels = []
    const channelList = Object.keys(browserTabChannelsMap);
    for (let i = 0; i < channelList.length; i++) {
        const dindex = browserTabChannelsMap[channelList[i]].indexOf(clientSessionId);
        if (dindex > -1) {
            channels.push(channelList[i])
        }
    }
    clients[clientSessionId].postMessage({
        cmd: workerEvents.channelList,
        msg: channels.join(",")
    });
}

// Unsubscribe from channel 
const unSubscribeChannel = (clientSessionId, channelName) => {
    if (channelName in subsribedChannelsObjMap) {
        if (browserTabChannelsMap[channelName].length > 0) {
            const dindex = browserTabChannelsMap[channelName].indexOf(clientSessionId);
            if (dindex > -1) {
                browserTabChannelsMap[channelName].splice(dindex, 1);
            }
            if (browserTabChannelsMap[channelName].length == 0) {
                dbridge.channel.unsubscribe(channelName);
            }
        } else {
            dbridge.channel.unsubscribe(channelName);
        }
    }
}

// Subscribe to Channel 
const subscribeChannel = (clientSessionId, channelName) => {
    // If not already subscribed, do subscription process. If already subscribed, just put the client entry into the relation object.
    if (!(channelName in subsribedChannelsObjMap)) {
        try {
            const subChannel = dbridge.channel.subscribe(channelName)
            // Bind to Subscription success event
            subChannel.bind("dbridges:subscribe.success", (payload, metadata) => {
                subsribedChannelsObjMap[channelName] = subChannel
                browserTabChannelsMap[channelName] = [clientSessionId]
                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'Subscription success for channel:' + channelName,
                    err: ''
                });
            });
            // Bind to Subscription failure event
            subChannel.bind("dbridges:subscribe.fail", (payload, metadata) => {
                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'Subscription failed for channel:' + channelName,
                    err: JSON.stringify(payload)
                });
            });

            // Bind to all events received and pass it on to frontend thread
            subChannel.bind_all((payload, metadata) => {
                if (metadata.eventname.substring(0, 9) != 'dbridges:') {
                    if (browserTabChannelsMap[channelName].length > 0) {
                        for (let j = 0; j < browserTabChannelsMap[channelName].length; j++) {
                            clients[browserTabChannelsMap[channelName][j]].postMessage({
                                cmd: workerEvents.event,
                                channelname: metadata.channelname,
                                eventname: metadata.eventname,
                                payload: payload,
                                metadata: metadata
                            });
                        }
                    }
                }
            });

            // Bind to Subscription failure event
            subChannel.bind("dbridges:unsubscribe.success", (payload, metadata) => {
                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'UnSubscription success for channel:' + channelName,
                    err: ''
                });
                delete subsribedChannelsObjMap[channelName]
                delete browserTabChannelsMap[channelName]
            });

            subChannel.bind("dbridges:unsubscribe.fail", (payload, metadata) => {
                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'UnSubscription failed for channel:' + channelName,
                    err: ''
                });
            });
        } catch (err) {
            clients[clientSessionId].postMessage({
                cmd: workerEvents.dbLog,
                msg: 'dataBridges Subscription exception..',
                err: err.source + ',' + err.code + ',' + err.message
            });
        }
    } else {
        if (browserTabChannelsMap[channelName].length == 0) {
            browserTabChannelsMap[channelName] = [clientSessionId];
        } else if (!browserTabChannelsMap[channelName].includes(clientSessionId)) {
            browserTabChannelsMap[channelName].push(clientSessionId);
        }
        clients[clientSessionId].postMessage({
            cmd: workerEvents.dbLog,
            msg: 'Subscription success to channel:' + channelName,
            err: ''
        });
    }
}

// Publish to Subscribed Channel
const publishToChannel = (clientSessionId, channelName, eventName, payload) => {
    if (channelName in subsribedChannelsObjMap) {
        const dindex = browserTabChannelsMap[channelName].indexOf(clientSessionId);
        if (dindex > -1) {
            try {
                subsribedChannelsObjMap[channelName].publish(eventName, payload);

                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'Published payload to channel :' + channelName + ', event:' + eventName,
                    err: ''
                });
            } catch (err) {
                clients[clientSessionId].postMessage({
                    cmd: workerEvents.dbLog,
                    msg: 'Publish failed to channel :' + channelName,
                    err: err.source + ',' + err.code + ',' + err.message
                });
            }
        } else {
            clients[clientSessionId].postMessage({
                cmd: workerEvents.dbLog,
                msg: 'Not subscribed to channel :' + channelName,
                err: ''
            });
        }
    } else {
        clients[clientSessionId].postMessage({
            cmd: workerEvents.dbLog,
            msg: 'Not subscribed to channel :' + channelName,
            err: ''
        });
    }
}

