let dedicatedWorker = null;
let setZoom = true;

// Initialize Google Maps.
let locations = [];
let markers = [];
let map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: new google.maps.LatLng(19.20523785355168, 72.85948266583667),
    mapTypeId: google.maps.MapTypeId.ROADMAP
});

// Main frontend JS  to worker communication identities.
const workerEvent = {
    subscribe: 1,
    dbStatus: 11,
    dbLog: 12,
    event: 16
}

// Logging function.
const logit = (data) => {
    let prnStr = '<span class="logdate">' + new Date().format("HH:MM:ss") + '</span>';
    for (let i = 0; i < data.length; i++) {
        prnStr = prnStr + '&#09;' + data[i];
    }
    $('#loggerdiv').prepend(prnStr + '<br />');
};

// Move the marker based on received data.
const addMarker = (payload) => {
    markerCoordinates = JSON.parse(payload);
    // Clear the previous marker from google map
    if (markers[markerCoordinates.sl]) {
        markers[markerCoordinates.sl].setMap(null)
    }
    let markerIcon
    switch (markerCoordinates.sl) {
        case 0:
            markerIcon = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            break;
        case 1:
            markerIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
            break;
        case 2:
            markerIcon = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
            break;
        default:
            markerIcon = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
    marker = new google.maps.Marker({
        icon: markerIcon,
        position: new google.maps.LatLng(markerCoordinates.coordinates[1], markerCoordinates.coordinates[0]),
        map: map,
        title: markerCoordinates.trackerid,
        label: {
            color: 'black',
            fontWeight: 'bold',
            text: markerCoordinates.trackerid,
        }
    });
    //markers.push(marker)
    markers[markerCoordinates.sl] = marker
    if (setZoom) {
        map.setCenter(new google.maps.LatLng(markerCoordinates.coordinates[1], markerCoordinates.coordinates[0]));
        map.setZoom(18);
        setZoom = false;
    }
    //}
};

// send subscribe command to the worker
const subscribeToChannel = () => {
    dedicatedWorker.postMessage({
        cmd: workerEvent.subscribe,
        data: {
            channel: 'gps'
        }
    })
};

//on message recieved from the worker std out the recieved message on html page
if (window.Worker) {
    dedicatedWorker = new Worker("dbridgesDedicatedWorker.js");
    dedicatedWorker.onmessage = function (e) {
        const recdData = e.data;
        switch (recdData.cmd) {
            case workerEvent.dbStatus:
                // Databridge connection status.
                $('#dbConnStatus').html(recdData.msg);
                if (recdData.msg == 'Online') {
                    subscribeToChannel();
                }
                break;
            case workerEvent.dbLog:
                // Log messages recieved from SharedWorker
                logit([recdData.msg, recdData.err != '' ? 'Error : ' + recdData.err : '']);
                break;
            case workerEvent.event:
                // Data Event received from dataBridges Event listner.
                logit(['Event Received :', recdData.eventname, recdData.payload]);
                if (recdData.eventname == 'gps-coordinates') {
                    addMarker(recdData.payload);
                }
                break;
            default:
                break;
        }
    };
} else {
    logit("Your browser does not support SharedWorkers")
}

const showHideLog = () => {
    $('#loggerdiv').toggle("slow");
}


