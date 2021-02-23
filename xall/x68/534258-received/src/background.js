/* global browser:readonly */

"use strict";

function parseReceivedHeader(headerStr, regexp) {
    const capturedSubstr = headerStr.match(new RegExp(regexp));
    if (capturedSubstr === null || typeof capturedSubstr[1] === "undefined")
        return null;
    return capturedSubstr[1];
}

function parseReceivedHeaders(headers, regexp) {
    const received = [];
    headers.forEach(function (header) {
        const parsed = parseReceivedHeader(header, regexp);
        if (parsed !== null)
            received.push(parsed);
    });
    return received;
}

browser.storage.local.get().then((res) => {
    if (!res.regexp) {
        browser.storage.local.set({regexp: "(.*)"});
    }
});

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    browser.messages.getFull(message.id).then((messagepart) => {
        const headers = messagepart.headers.received;
        if (headers) {
            browser.storage.local.get().then((res) => {
                const parsed = parseReceivedHeaders(headers, res.regexp);
                browser.displayReceivedHeader.setReceivedHeaderValue(tab.id, parsed);
                browser.displayReceivedHeader.setReceivedHeaderHidden(tab.id, !parsed.length);
            });
        } else {
            browser.displayReceivedHeader.setReceivedHeaderHidden(tab.id, true);
        }
    });
});

browser.displayReceivedHeader.init();
