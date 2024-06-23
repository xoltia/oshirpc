window.addEventListener("SendToLoader", function (message) {
    console.debug(message);

    chrome.runtime.sendMessage({
        messageType: "UPDATE_PRESENCE_DATA",
        ...message.detail,
    });
}, false);

const mainScript = document.createElement("script");
mainScript.src = chrome.runtime.getURL("/content.js");
mainScript.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(mainScript);
