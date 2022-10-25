/* 
    Code a geolocation app to publish 'geo location ' message. every 1 seconds
*/

// Include dataBridges client library package
const dBridges = require('databridges-sio-client-lib');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs/promises');

// Replace your dataBrdiges Application Key and Authentication URL below.
const applicationKey = 'app_key';
const authenticationURI = 'auth_url';

const options = {
    ignoreAttributes: false,
    alwaysCreateTextNode: false
};
const parser = new XMLParser();

let filepath = 'gpsCoordinates.kml'
let jsonObj = null;
let timer_handler = null;
let to_stop = null;
let position = 0;

//read the Walkers.kml kml file, obtain the xml data and pharse the xml 
async function readkmlFile() {
    try {
        const data = await fs.readFile(filepath, { encoding: 'utf8' });
        jsonObj = parser.parse(data, options);
    } catch (err) {
        console.log(err);
    }
}

readkmlFile();

// for every 1 second get the coordinates from the Walkers.kml and publish 
const getnextData = (position) => {
    var kml_dict = []
    kml_dict.length = 0
    if (jsonObj) {
        for (let i = 0; i < jsonObj.kml.Document.Folder.length; i++) {
            var cArray = jsonObj.kml.Document.Folder[i].Placemark[0].LineString.coordinates.split('\n')
            to_stop = 0;
            if (position < cArray.length) {
                new_position = position
                to_stop = 1
            } else {
                new_position = cArray.length - 1
                to_stop = to_stop + 0
            }
            var d = { trackerid: jsonObj.kml.Document.Folder[i].name, coordinates: cArray[new_position].trim().split(",") }

            kml_dict.push(d)
        }
        return kml_dict
    }
}

// Initialize dataBridges client
const dbridge = new dBridges();
// Replace your application key below, which you have received from dataBridges management portal.
// use environmental variables for greater security of your keys
dbridge.appkey = applicationKey;

// Replace your authentication url below, which you have received from dataBridges management portal.
// example https://endpoint01.databridges.io/client/v1/authenticate
// use environmental variables for greater security of your keys
dbridge.auth_url = authenticationURI;

// Connect to dataBridges. If any runtime error it will be caught in catch().
dbridge.connect().catch((err) => {
    console.log('dataBridges Connection exception..', err.source, err.code, err.message);
});

//Bind to disconnected event, to get intimation about dataBridges network disconnection.
dbridge.connectionstate.bind("disconnected", () => {
    console.log('Disconnected from dataBridges real-time network');
});

dbridge.connectionstate.bind("connected", () => {
    console.log('Connected to dataBridges real-time network !!!');
    let gps = null;
    try {
        // Subscribe to channel 'gps',
        gps = dbridge.channel.subscribe('gps')
    } catch (err) {
        // Subscribe errors will be handled here.
        console.log('Channel subscription faced an exception: ', err.source, err.code, err.message);
    }
    // We will bind to subscription success event. On success, we will publish event messages.
    gps.bind("dbridges:subscribe.success", (payload, metadata) => {
        // we can also check if the gps subscription isOnline.
        console.log("dbridges:subscribe.success");
        if (gps.isOnline()) {
            // for every one second publish the coordinates 
            // event data : { groupid: "group id" ,  trackerid: "tracker id", coordinates: [3,77.6351,12.90839,0]}
            timer_handler = setInterval(() => {
                try {
                    if (gps.isOnline()) {
                        var to_send = getnextData(position)
                        if (to_stop > 0) {
                            for (j = 0; j < to_send.length; j++) {
                                var to_send2 = to_send[j]
                                to_send2.sl = j
                                gps.publish('gps-coordinates', JSON.stringify(to_send2));
                            }
                            position = position + 1
                        } else {
                            clearInterval(timer_handler)
                            process.exit(1)
                        }
                    }
                } catch (err) {
                    // Any publish error will be caught here.
                    console.log('Publishing messages faced an exception:  ', err.source, err.code, err.message);
                }
            }, 1000 * 1);
        }
    });

    // Bind to Subscription failure event, to get notified if subscription to channel has been rejected by dataBridges network
    gps.bind("dbridges:subscribe.fail", (payload, metadata) => {
        console.log('Channel subscription faced an exception:', payload.source, payload.code, payload.message);
    });

});