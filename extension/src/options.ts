const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
const form = document.querySelector("form") as HTMLFormElement;

function saveOptions(e: Event) {
    e.preventDefault();
    const apiKey = apiKeyInput.value;
    browser.storage.local.set({ holodexApiKey: apiKey }).then(() => {
        console.log("API key saved");
    });
}

function restoreOptions() {
    browser.storage.local.get("holodexApiKey").then((result) => {
        const apiKey = result.holodexApiKey;
        if (apiKey) {
            apiKeyInput.value = apiKey;
            console.log("API key restored:", apiKey);
        } else {
            console.log("No API key found in storage");
        }
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
form.addEventListener("submit", saveOptions);
