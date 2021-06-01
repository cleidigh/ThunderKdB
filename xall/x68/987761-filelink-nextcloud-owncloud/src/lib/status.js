/**
 * Global Map to hold Status objects for all active uploads, indexed by the uploadId created in background.js
 */
const attachmentStatus = new Map();

/**
 * Wait for messaging connection, opened when status popup is opened
 */
let port = null;
browser.runtime.onConnect.addListener(p => {
    p.postMessage(attachmentStatus);
    port = p;
    port.onDisconnect.addListener(() => port = null);
    port.onMessage.addListener(MsgHandler.dispatch);
});

/**
 * Class to hold status of one upload
 */
class Status {
    constructor(filename) {
        this.filename = filename;
        // Define display in ../progress/progress.js
        // and as status_<your string> in _locales
        this.status = 'preparing';
        this.progress = 0;
        this.error = false;
    }

    /**
     * Update badge and send status to status popup, if it's listening (open)
     */
    static async update() {
        const messages = attachmentStatus.size.toString();
        messenger.composeAction.setBadgeText({ text: messages !== "0" ? messages : null, });
        if (port) {
            port.postMessage(attachmentStatus);
        }
    }

    /**
     * Remove one upload from the status map
     * @param {string} uploadId The id of the upload created in background.js
     */
    static async remove(uploadId) {
        attachmentStatus.delete(uploadId);
        Status.update();
    }

    /**
     * Set new status, possible values defined in _locales and progress.js
     * @param {string} s The new status
     */
    async set_status(s) {
        this.status = s;
        Status.update();
    }

    /**
     * Set the upload status to error state
     */
    async fail() {
        this.error = true;
        Status.update();
    }

    /**
     * Update the upload progress
     * @param {number} p Fraction of data already transferred as a float
     */
    async set_progress(p) {
        this.progress = p;
        Status.update();
    }
}

class MsgHandler {
    /**
     * Dispatch a command received as a message to the method of the same name
     * @param {string} msg The command as received as a message
     */
    static dispatch(msg) {
        // Check if it's defined within this class as a static method
        if ('function' === typeof MsgHandler[msg]) {
            MsgHandler[msg]();
        } else {
            throw ReferenceError('No handler for ' + msg);
        }
    }

    /**
     * Remove all Status objects from attachmentStatus that are in error state
     */
    static clearcomplete() {
        attachmentStatus.forEach((v, k, m) => { if (true === v.error || 'generatedpassword' === v.status) { m.delete(k); } });
        Status.update();
    }
}

/* Make jshint happy */
/* exported attachmentStatus, Status */