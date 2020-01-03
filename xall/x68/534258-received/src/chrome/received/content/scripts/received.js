"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

const Received = {};

Received.parseReceivedHeader = function (headerStr, regexp) {
    const capturedSubstr = headerStr.match(new RegExp(regexp));
    if (capturedSubstr === null)
        return null;
    return capturedSubstr[1];
};

Received.parseReceivedHeaders = function (headers, regexp) {
    const received = [];
    if ("received" in headers) {
        headers.received.forEach(function (header) {
            const parsed = Received.parseReceivedHeader(header, regexp);
            if (parsed !== null)
                received.push(parsed);
        });
    }
    return received;
};
