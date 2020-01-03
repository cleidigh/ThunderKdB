/*jslint browser: true */
(function () {
    "use strict";
    window.setProgress = function (aPercent) {
        var elem = document.getElementById("resubmit-batch-progress");
        elem.value = aPercent;
    };
    window.setTotalProgress = function (aPercent) {
        var elem = document.getElementById("resubmit-batch-totalProgress");
        elem.value = aPercent;
    };
    window.setStatus = function (aString) {
        var elem = document.getElementById("resubmit-batch-status");
        elem.value = aString;
    };
    window.batchDone = function () {
        var btnClose = document.getElementById("resubmit-batch-close"),
            btnCancel = document.getElementById("resubmit-batch-cancel");
        btnCancel.disabled = true;
        btnClose.disabled = false;
    };
    window.batchReset = function () {
        var btnClose = document.getElementById("resubmit-batch-close"),
            btnCancel = document.getElementById("resubmit-batch-cancel");
        btnCancel.disabled = false;
        btnClose.disabled = true;
    };
    window.onCancel = function () {
        return;
    };
    window.setCancelCallback = function (callback) {
        window.onCancel = function () { callback(); };
    };
}());
// vim: set expandtab tabstop=4 shiftwidth=4:
