"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var Received = {};

Received.parseReceivedHeader = function(headerStr, regexp) {
        var capturedSubstr = headerStr.match(new RegExp(regexp));
        if (capturedSubstr == null)
            return null;
    return capturedSubstr[1];
};

Received.parseReceivedHeaders = function(headers, regexp) {
    var received = Array();
    if ('received' in headers) {
        headers['received'].forEach(function(header) {
            var parsed = Received.parseReceivedHeader(header, regexp);
            if (parsed != null)
                received.push(parsed);
        });
    }
    return received;
};
