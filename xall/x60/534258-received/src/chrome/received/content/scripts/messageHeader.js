"use strict";

Received.Message = {};

Received.Message.displayReceivedHeader = function() {
    var regexp = Services.prefs.getCharPref("extensions.received.regexp");
    var rowEl = document.getElementById("expandedReceivedRow");
    var hdrEl = document.getElementById("receivedReceivedHeader");
    var msg = gMessageDisplay.displayedMessage;

    rowEl.collapsed = true;

    if (!msg.folder) {
        return
    };

    MsgHdrToMimeMessage(msg, null, function(aMsgHdr, aMimeMsg) {
        var parsed = Received.parseReceivedHeaders(aMimeMsg.headers, regexp);
        rowEl.collapsed = (parsed.length == 0);
        hdrEl.headerValue = parsed;
        hdrEl.valid = true;
    }, true, {
        partsOnDemand: true
    });
}

Received.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = function() {
        Received.Message.displayReceivedHeader();
    };
    gMessageListeners.push(listener);
};

Received.Message.onUnload = function() {
    window.removeEventListener("load", Received.Message.onLoad, false);
    window.removeEventListener("unload", Received.Message.onUnload, false);
};

window.addEventListener("load", Received.Message.onLoad, false);
window.addEventListener("unload", Received.Message.onUnload, false);
