let dbSharedWorker = null;
let workerSessionId = null;

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

// Logging function.
const logit = (data) => {
    let prnStr = '<span class="logdate">' + new Date().format("HH:MM:ss") + '</span>';
    for (let i = 0; i < data.length; i++) {
        prnStr = prnStr + '&#09;' + data[i];
    }
    $('#loggerdiv').prepend(prnStr + '<br />');
}

// addeventlistener to capture onclose events and sent the close command to the shared worker
addEventListener('beforeunload', function () {
    if (workerSessionId) {
        dbSharedWorker.port.postMessage({
            cmd: workerEvents.closing,
            sessionid: workerSessionId
        });
    }
});

// onClick logout Call logout route.
const logOut = () => {
    fetch('/logout', {
        method: "GET",
    }).then(response => {
        if (workerSessionId) {
            dbSharedWorker.port.postMessage({
                cmd: workerEvents.logout,
                sessionid: workerSessionId
            });
        }
        if (response.redirected) {
            window.location.href = response.url
        }
    }).catch(error => {
        logit(['Fetch Exception :', error]);
    });
}

// onClick subscribe button event from the html page and send subscribe command to the shared worker
const subscribeToChannel = () => {
    if (workerSessionId) {
        dbSharedWorker.port.postMessage({
            cmd: workerEvents.subscribe,
            sessionid: workerSessionId,
            data: {
                channel: $('#channelname').val()
            }
        });
    }
}

// onClick unsubscribe button event from the html page and send unsubscribe command to the shared worker
const unSubscribeFromChannel = () => {
    if (workerSessionId) {
        dbSharedWorker.port.postMessage({
            cmd: workerEvents.unsubscribe,
            sessionid: workerSessionId,
            data: {
                channel: $('#channelname').val()
            }
        });
    }
}

// onClick list button event from the html page and send list command to the shared worker
const getChannelList = () => {
    if (workerSessionId) {
        dbSharedWorker.port.postMessage({
            cmd: workerEvents.channelList,
            sessionid: workerSessionId
        });
    }
}

// onClick list button event from the html page and Publish command to the shared worker
const publishToChannel = () => {
    if (workerSessionId) {
        dbSharedWorker.port.postMessage({
            cmd: workerEvents.publish,
            sessionid: workerSessionId,
            data: {
                channel: $('#channelname').val(),
                event: 'HelloWorld',
                payload: $('#payload').val()
            }
        });
    }
}

//on message recieved from the shared worker std out the recieved message on html page
if (!!window.SharedWorker) {
    dbSharedWorker = new SharedWorker("dbridgesSharedWorker.js");
    dbSharedWorker.port.onmessage = function (e) {
        const recdData = e.data;
        switch (recdData.cmd) {
            case workerEvents.dbStatus:
                // Databridge connection status.
                $('#dbConnStatus').html(recdData.msg);
                break;
            case workerEvents.session:
                // SessionId recieved from SharedWorker
                workerSessionId = recdData.data;
                break;
            case workerEvents.dbLog:
                // Log messages recieved from SharedWorker
                logit([recdData.msg, recdData.err != '' ? 'Error : ' + recdData.err:'']);
                break;
            case workerEvents.clientLength:
                // Connected Client Length received from SharedWorker
                $('#workerCount').html(recdData.msg);
                break;
            case workerEvents.channelList:
                // Client List received from SharedWorker
                logit(['Channels Subscribed :', recdData.msg]);
                break;
            case workerEvents.event:
                // Data Event received from dataBridges Event listner.
                logit(['Event Received :', recdData.channelname, recdData.eventname, recdData.payload, JSON.stringify(recdData.metadata)]);
                break;
            case workerEvents.logout:
                // One of the browser connects has logged off .. all connections and session is destroyed. Logout this connect also.
                window.location.href = '/logout'
                break;
            default:
                break;
        }
    };
} else {
    logit("Your browser does not support SharedWorkers")
}



