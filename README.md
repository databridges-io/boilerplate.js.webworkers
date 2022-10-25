# dataBridges and Web workers 

dataBridges allows you deliver highly responsive real-time user interface to your customer using dataBridges channels along with event bindings. 

When your web app has cpu consuming message manipulation such as encryption / decryption, data transformation before sending (publish) or after receiving (bind.channelEvents) real-time data, you can easily use Web Workers to run your JS functions. They are useful because they give you another thread to perform operations in. This can help free up the main thread and keep the app interactive.

[dataBridges JavaScript SDK](https://github.com/databridges-io/lib.js.browser.sio.client) can be easily used inside web workers and supports both dedicated and shared worker.

### dataBridges as dedicated workers 

You will use dedicated workers if your app is a single instance app or each app page interface is completely independent from other (for example duplicating the running browser tab for example is not supported in your application).

We have developed a ready to use dbridge-dedicatedWorker.js boilerplate code for your usage. 

### dataBridges as shared workers 

Shared workers are special web workers that can be accessed by multiple browser contexts like browser tabs, windows, iframes, or other workers, etc. All browser contexts must be within the same domain in accordance with the same-origin policy.

The difference between dedicated and shared workers is that dedicated workers can only be accessed by one script. Shared workers can be accessed by multiple scripts even if each page run inside different windows.

You will use shared worker if your app supports multiple browser tabs, windows, iframes and each of them consumes a global state updated by your application server using dataBridges channels or client functions. Also shared worker is useful to limit the number of dataBridges connection.

We have developed a ready to use dbridge-sharedWorker.js boilerplate code for your usage. 


### dataBridges web worker boilerplate 

We have released fully functional boilerplate code for dedicated web workers (dbridge-dedicateWorker.js) and shared web worker (dbridge-sharedworker.js).
​
- Once the worker is instantiated, we can send channel subscription and unsubscription to the worker. The worker in turn will connect to the dataBridges network and manage the channel communication. it will emit back the Channel event messages back to the browser tabs, windows which have subscribed to the channels.
- The worker will also send the state information (Online or Offline) back to tabs and windows.
- Channel subscription is useful in the shared worker scenario as the application might open multiple tab / windows which might want to subscribe to different set of channels. Moreover the worker manages the multiplexing of same channel subscription across tabs and windows.
​