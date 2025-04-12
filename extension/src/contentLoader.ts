window.addEventListener("SendToLoader", function (message: any) {
    console.debug(message);
    browser.runtime.sendMessage((message as CustomEvent).detail);
}, false);

const mainScript = document.createElement("script");
mainScript.src = browser.runtime.getURL("/content.js");
mainScript.onload = function () {
    (this as HTMLScriptElement).remove();
};
(document.head || document.documentElement).appendChild(mainScript);
