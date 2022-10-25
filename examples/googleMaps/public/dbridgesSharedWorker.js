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
    closing: 5,
    dbStatus: 11,
    dbLog: 12,
    clientLength: 13,
    session: 15,
    event: 16,
    logout: 17
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
        // Send connected client dataBridges connection status.
        if (dbridge.connectionstate.isconnected) {
            port.postMessage({
                cmd: workerEvents.dbStatus,
                msg: 'Online'
            });
        }
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

// Subscribe to Channel and listen on eventName
const subscribeChannel = (clientSessionId, channelName) => {
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

            // Bind to Custom data event
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

