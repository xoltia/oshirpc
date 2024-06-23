let port = browser.runtime.connectNative("com.github.xoltia.oshirpc");

chrome.runtime.onMessage.addListener((message) => {
    console.debug(message);
    console.debug(port);
    if (message.messageType === "UPDATE_PRESENCE_DATA") {
        port.postMessage(message);
    };
});
