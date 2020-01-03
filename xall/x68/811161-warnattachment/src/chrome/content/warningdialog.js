/**
 * A warning dialog with a timeout
 * Jens Dede, warnattachment@jdede.de
 */

var intervalId;         // Timer for the interval, used to cancel it
var secondsLeft = -1;   // Number of seconds left
var acceptLabel;        // Store the original label of the ok button
var timeout = 0         // The timeout for the current dialog

/**
 * Setup everything when loading the XUL file
 */
function onLoad() {
    var dlg = document.getElementById("warnattachmentWarningDialog");
    var acceptButton = dlg.getButton("accept");
    acceptLabel = acceptButton.getAttribute("label");

    timeout = window.arguments[2];
    title = window.arguments[0];
    text = window.arguments[1];

    dlg.setAttribute("title", title);
    document.getElementById("warnattachmentWarningDialogText").textContent = text;

    // Disable the ok button and set the number of remaining seconds as the
    // label, update every second
    if (timeout > 0) {
        disableOk();
        secondsLeft = timeout;
        acceptButton.setAttribute("label", secondsLeft);
        intervalId = window.setInterval(updateOkButton, 1000);
    }

    document.addEventListener("dialogaccept", function(event) {
        doOK();
    });

    document.addEventListener("dialogcancel", function(event) {
        doCancel();
    });
}


/**
 * User clicked ok, set the corresponding return value
 */
function doOK() {
    window.arguments[3].value = 1;
    return;
}

/**
 * User clicked cancel, set the corresponding return value
 */
function doCancel() {
    window.arguments[3].value = -1;
    window.clearInterval(intervalId);
    return;
}

/**
 * Update the ok button (set the remaining time) and cancel the timers after
 * the timeout
 */
function updateOkButton(){
    secondsLeft--;
    var dlg = document.getElementById("warnattachmentWarningDialog");
    if (secondsLeft > 0){
        dlg.getButton("accept").setAttribute("label", secondsLeft);
    } else {
        window.clearInterval(intervalId);
        dlg.getButton("accept").setAttribute("label", acceptLabel);
        enableOk();
    }
}


/**
 * Disable the OK button
 */
function disableOk() {
    var dlg = document.getElementById("warnattachmentWarningDialog");
    dlg.getButton("accept").setAttribute("disabled", "true");
}

/**
 * Enable the OK button
 */
function enableOk() {
    var dlg = document.getElementById("warnattachmentWarningDialog");
    dlg.getButton("accept").setAttribute("disabled", "false");
}

