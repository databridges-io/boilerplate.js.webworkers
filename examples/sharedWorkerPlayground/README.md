# dataBridges Shared Worker Playground 

This boilerplate examples demonstrates how to use [dataBridges JavaScript SDK](https://github.com/databridges-io/lib.js.browser.sio.client) easily into your web application as a shared worker. The app sends channel subscription and unsubscription to the worker. The worker in turn will connect to the dataBridges network and manage the channel communication. it will emit back the Channel event messages back to the browser tabs, windows which have subscribed to the channels.

### Prerequisites

> NodeJS to run web server serving the static pages and Secured Token authentication.
>

### Major Components of this example

Lets first understand how this example is structured and how to run it.

To run this example you need to run a web server.  Node Express server also serves static files which will be exposed on root folder on port 4000 in case of this example. 

Once the web server is up and running (`node server.js`), to access Shared worker playground, you can browse to `https://localhost:4000/` this will open index.html login page. Hardcoded login details are provided in `server.js` file.

The html file embeds respective JS file to start the shared worker and start the worker. `sharedWorkerExample.html` embeds `sharedWorkerExample.js` which starts SharedWorker `dbridgesSharedWorker.js`. Details of each file is explained below.

> - server.js 
> - /public/dbridgesSharedWorker.js
> - /public/sharedWorkerExample.js
> - /public/sharedWorkerExample.html
>

#### server.js 

Express web server serving static pages, authentication routes and session management.

Provided code can be run using `node server.js` after doing below modification.

```javascript
// Replace your dataBrdiges Application Key and Application Secret below.
const dbApplnKey = 'app_key';
const dbApplnSecret = 'app_secret';
```

Above `app_key` and `app_secret` can be obtained from https://dashboard.databridges.io. This is used for validating the authentication token used for private,presence and system channel.

You can modify username and password in the temporary `userDb` object for running this demonstration.

```javascript
//sample username and password database
const userDb = {
    user1: 'mypassword',
    user2: 'mypassword',
    user3: 'mypassword',
    user4: 'mypassword'
}
```

Upon running `node server.js`, web server will be started on `0.0.0.0:4000`. You can now browse this `http://ip:port` on your favorite browser to access the running example. Before going further, do read this document further. Few more modification is required to see this code running without any issues.

#### /public/dbridgesSharedWorker.js

dataBridges Shared worker code customized to work smoothly as shared Worker in supported browsers. Before running the code you need to modify below code by replacing `app_key` and `auth_url` as obtained from https://dashboard.databridges.io. 

```javascript
// Replace your dataBrdiges Application Key and Authentication URL below.
const dbApplnKey = 'app_key';
const dbAuthURL = 'auth_url';
```

#### /public/sharedWorkerExample.js

This is the JavaScript code which is interacting with HTML page. This runs with every browser instance, This script is responsible for instantiating the shared worker instance and communicating with it based on user actions and response data.

#### /public/sharedWorkerExample.html

Frontend page demonstrating the functionality of shared workers. This page shows number of browser instance connected to the shared worker. Logger view shows interaction logs between shared worker and the tabs . You can check additional functionalities like subscribe to channel, unsubscribe to channel, Publish etc. using the buttons provided. All incoming events will be listed in the logger view. 





