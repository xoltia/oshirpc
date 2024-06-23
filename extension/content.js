/*
Copyright (c) 2022-2023 Michael Ren
Licensing and distribution info can be found at the GitHub repository
https://github.com/XFG16/YouTubeDiscordPresence
*/

const MESSAGE_FREQUENCY = 1000;
const AD_SELECTOR = "div.ytp-ad-player-overlay-instream-info"; // DOCUMENT; THIS HAS TO BE DONE BECAUSE IF AN AD PLAYS IN THE MIDDLE OF A VIDEO, THEN GETPLAYERSTATE WILL STILL RETURN 1
const LIVESTREAM_ELEMENT_SELECTOR = "div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-left-controls > div.ytp-time-display.notranslate.ytp-live > button"; // VIDEO PLAYER
const MINIPLAYER_ELEMENT_SELECTOR = "div.ytp-miniplayer-ui"; // VIDEO PLAYER
const MAIN_LIVESTREAM_TITLE_SELECTOR = "div.ytp-chrome-top > div.ytp-title > div.ytp-title-text > a.ytp-title-link"; // VIDEO PLAYER
const MAIN_LIVESTREAM_AUTHOR_SELECTOR = "#upload-info > #channel-name > #container > #text-container > #text > a"; // DOCUMENT HTML
const MINIPLAYER_LIVESTREAM_AUTHOR_SELECTOR = "#video-container #info-bar #owner-name"; // DOCUMENT HTML
const NO_MINIPLAYER_ATTRIBUTE = "display: none;";
const YES_MINIPLAYER_ATRRIBUTE = "";

/**
 * @typedef DocumentData
 * @property {string | null} title
 * @property {string | null} author
 * @property {string | null} channelUrl
 * @property {string | null} channelId
 * @property {string | null} channelThumbnailUrl
 * @property {string | null} videoId
 * @property {string | null} thumbnailUrl
 * @property {number | null} timeLeft
 */

/** @type {DocumentData} */
const documentData = {
    title: null,
    author: null,
    channelUrl: null,
    videoId: null,
    thumbnailUrl: null,
    timeLeft: null
};
const videoPlayer = document.getElementById("movie_player");

async function getOEmbedData(videoId) {
    const response = await fetch(`https://www.youtube.com/oembed?url=http%3A//youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok)
        throw new Error(response.statusText);
    return response.json();
}

function getLivestreamData() {
    const miniplayerElement = videoPlayer.querySelector(MINIPLAYER_ELEMENT_SELECTOR);
    if (!miniplayerElement || (miniplayerElement && miniplayerElement.getAttribute("style") == NO_MINIPLAYER_ATTRIBUTE)) {
        let titleHTML = videoPlayer.querySelector(MAIN_LIVESTREAM_TITLE_SELECTOR);
        let authorHTML = document.querySelector(MAIN_LIVESTREAM_AUTHOR_SELECTOR);
        documentData.title = titleHTML ? titleHTML.innerText : null;
        documentData.author = authorHTML ? authorHTML.innerText : null;
        documentData.channelUrl = authorHTML ? authorHTML.href : null;
    } else if (miniplayerElement && miniplayerElement.getAttribute("style") == YES_MINIPLAYER_ATRRIBUTE) {
        let titleHTML = videoPlayer.querySelector(MAIN_LIVESTREAM_TITLE_SELECTOR);
        let authorHTML = document.querySelector(MINIPLAYER_LIVESTREAM_AUTHOR_SELECTOR);
        documentData.title = titleHTML ? titleHTML.innerText : null;
        documentData.author = authorHTML ? authorHTML.innerText : null;
        documentData.channelUrl = authorHTML ? authorHTML.href : null;
    }
}

function getTimeData() {
    if (videoPlayer.getDuration() && videoPlayer.getCurrentTime()) {
        documentData.timeLeft = videoPlayer.getDuration() - videoPlayer.getCurrentTime();
        if (documentData.timeLeft < 0) {
            documentData.timeLeft = null;
        }
    } else {
        documentData.timeLeft = null;
        console.warn("Unable to get timestamp data");
    }
}

function sendDocumentData() {
    console.debug(documentData);
    if (documentData.title && documentData.author && documentData.timeLeft) {
        if (documentData.author.endsWith(" - Topic")) {
            documentData.author = documentData.author.slice(0, -8);
        }
        let messageEvent = new CustomEvent("SendToLoader", { detail: documentData });
        window.dispatchEvent(messageEvent);
    }
}

function handleYouTubeData() {
    const livestreamElement = videoPlayer.querySelector(LIVESTREAM_ELEMENT_SELECTOR);
    const lastVideoId = documentData.videoId;
    documentData.videoId = new URL(videoPlayer.getVideoUrl()).searchParams.get('v');
    documentData.thumbnailUrl = `https://i.ytimg.com/vi/${documentData.videoId}/hqdefault.jpg`;

    if (lastVideoId == documentData.videoId) {
        getTimeData();
        sendDocumentData();
        return;
    }

    if (livestreamElement) {
        getLivestreamData();
        documentData.timeLeft = -1;
        sendDocumentData();
        return;
    }

    getOEmbedData(documentData.videoId).then(data => {
        console.log(data);
        documentData.title = data.title;
        documentData.author = data.author_name;
        documentData.channelUrl = data.author_url;
        getTimeData();
        sendDocumentData();
    }).catch(error => {
        getLivestreamData();
        getTimeData();
        sendDocumentData();
        console.error(error);
    });
}

function sendInfo() {
    if (!videoPlayer)
        videoPlayer = document.getElementById("movie_player");

    if (videoPlayer && videoPlayer.getPlayerState() == 1 && document.querySelector(AD_SELECTOR) == null)
        handleYouTubeData();
}

setInterval(sendInfo, MESSAGE_FREQUENCY);
