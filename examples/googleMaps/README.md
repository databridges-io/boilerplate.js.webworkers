# Google Maps Example 

The Google Map example app receives map coordinates using dataBridges script that runs as shared worker. The web app uses Google Map interface to draw the Map coordinates. The sample app also has a NodeJS script called kmlGpsPublisher.js. This script reads a KML file for GPS coordinates and publishes the same to a GPS channel. The web app listens to the GPS channel and draws the map coordinates.

This app supports multiple entities to be tracked using maps. The example KML file attached represents a food delivery riders location tracking map. This has GPS rides map of multiple food delivery riders which is mapped realtime using Google Map system and dataBridges realtime api's in JavaScript web workers.

### Prerequisites

> NodeJS to run web server serving the static pages and to publish GPS Coordinates data.

### Major Components of this example

Lets first understand how this example is structured and how to run it.

To run this example you need to run a web server. In this case we will be using node express to run the HTTPS server (`server.js`). As we are using HTTPS server, you need to provide certificate files, If you do not have one following link will help you to create self signed SSL certificate. https://devopscube.com/create-self-signed-certificates-openssl/ . Node Express server also serves static files which will be exposed on root folder on port 4001 in case of this example. 

Once the HTTPS server is up and running (`node server.js`), to access Map Shared worker example, you can browse to `https://localhost:4001/` and access the `mapSharedWorkerExample.html`. To access dedicated worker example, you can browse to `https://localhost:4001/dedicatedworker` and access the `mapDedicatedWorkerExample.html`.

The html file embeds respective JS file to start the dedicated/shared worker and start the worker. `mapSharedWorkerExample.html` embeds `mapSharedWorkerExample.js` which starts SharedWorker `dbridgesSharedWorker.js`. Details of each file is explained below.

This example also provides a NodeJS program which publishes GPS coordinates for showing simulation on the MAP to get a realtime experience. Once your web server is up and running and you have access the website using the browser. Run `node kmlGpsPublisher.js` . This will start publishing set of coordinates from `gpsCoordinates.kml` every one second.  

> - server.js 
> - /public/dbridgesSharedWorker.js
> - /public/mapSharedWorkerExample.js
> - /public/mapSharedWorkerExample.html
> - /public/dbridgesDedicatedWorker.js
> - /public/mapDedicatedWorkerExample.js
> - /public/mapDedicatedWorkerExample.html
> - kmlGpsPublisher.js
> - gpsCoordinates.kml

#### server.js 

Express web server serving static pages, authentication routes and session management.

Provided code can be run using `node server.js` after doing below modification.

```javascript
https.createServer({
    key: fs.readFileSync("./cert/server.key"),
    cert: fs.readFileSync("./cert/server.crt"),
    ca: fs.readFileSync("./cert/ca.crt")
}, app).listen(PORT, '0.0.0.0', () => console.log(`Server Running at port ${PORT}`));
```

You need to provide local SSL certificate details in above code. If you do not have one following link will help you to create self signed SSL certificate. https://devopscube.com/create-self-signed-certificates-openssl/ 

Upon running `node server.js`, web server will be started on `0.0.0.0:4001`. You can now browse this `https://ip:4001` on your favorite browser to access the running example. Default route will point to shared worker example. For accessing dedicated worker example, browse to `https://ip:4001/dedicatedworker`. Before going further, do read this document further. Few more modification is required to see this code running without any issues.

### Shared Workers

#### /public/dbridgesSharedWorker.js

dataBridges Shared worker code is customized to work smoothly as shared Worker in supported browsers. Before running the code you need to modify below code by replacing `app_key` and `auth_url` as obtained from https://dashboard.databridges.io. 

```javascript
// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
```

#### /public/mapSharedWorkerExample.js

This is the JavaScript code which is interacting with HTML page. This runs with every browser instance, This script is responsible for instantiating the shared worker instance and communicating with it based on user actions and response data.

#### /public/mapSharedWorkerExample.html

Frontend page demonstrating the functionality of Google Maps using shared workers. Buttons provided to open new browser tab with same page name, which will demonstrate how same session tabs uses shared worker published data to populate the maps. To view interaction logs between shared worker and the tabs you can click on `Show/Hide Logs` button. This page has 2 components, one is to show the google maps and other to show the logger section.

### Dedicated Workers

#### /public/dbridgesDedicatedWorker.js

dataBridges web worker code is customized to work smoothly as dedicated Worker in supported browsers. Before running the code you need to modify below code by replacing `app_key` and `auth_url` as obtained from https://dashboard.databridges.io. 

```javascript
// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
```

#### /public/mapDedicatedWorkerExample.js

This is the JavaScript code which is interacting with HTML page. This runs with every browser instance, This script is responsible for instantiating the dedicated worker instance and communicating with it based on user actions and response data.

#### /public/mapDedicatedWorkerExample.html

Frontend page demonstrating the functionality of  Google Maps using dedicated workers. To view interaction logs between shared worker and the tabs you can click on `Show/Hide Logs` button. This page has 2 components, one is to show the google maps and other to show the logger section.

### Standalone NodeJS program to publish test GPS coordinates.

#### kmlGpsPublisher.js

kmlGpsPublisher.js is sample code which reads `gpsCoordinates.kml` file `(Google format)` and publishes each data point to channel `'gps'`. Before running the code you need to modify below code by replacing `app_key` and `auth_url` as obtained from https://dashboard.databridges.io. 

```javascript
// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
```

Upon running `node kmlGpsPublisher.js`, every second a set of data points will be published to the `'gps'` channel, On receipt of this data points, the frontend mapper plots the map.

A sample `gpsCoordinates.kml` file is available in source folder. You can use this kml file to test the map program or create your own kml file.

dataBridges network connection is established and on successful subscription of the `gps` channel. It starts a timer of 1 second. On each execution of timer it collects the set of GPS data points and publishes it to channel.

#### gpsCoordinates.kml

A sample `gpsCoordinates.kml` file is available in source folder. You can use this kml file to test the map program or create your own kml file.

You can use [this link](https://support.google.com/mymaps/answer/3109452?hl=en&co=GENIE.Platform%3DDesktop) to create your own kml files.

The attached sample gpsCoordinates.kml mimics food delivery riders realtime map location.



