/*jslint browser: true, unparam: true */
/*globals log */
/*globals gMsgCompose */

function ResubmitComposeListener(aCompletionFun) {
    "use strict";
    this.name = ResubmitComposeListener;
    this.notifyComplete = function () { aCompletionFun(); };
}

ResubmitComposeListener.prototype = {
    onWindowClose: function (e) {
        "use strict";
        log("debug: ResubmitComposeListener.onWindowClose(): called with (" + e + ")", 5);
        log("debug: ResubmitComposeListener.ComposeProcessDone(): invoking this.notifyComplete()", 6);
        this.notifyComplete();
        log("debug: ResubmitComposeListener.ComposeProcessDone(): returned from this.notifyComplete()", 7);
    }
};

(function () {
    "use strict";
    var stateListener = new ResubmitComposeListener(window.arguments[1]);
    window.addEventListener('unload', function (e) { stateListener.onWindowClose(e); }, false);
}());

// vim: set expandtab tabstop=4 shiftwidth=4:
