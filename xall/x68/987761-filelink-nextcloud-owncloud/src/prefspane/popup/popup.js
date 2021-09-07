const msgContainer = document.getElementById("msg_container");
const errorPopup = document.getElementById("error_popup");
const warningPopup = document.getElementById("warning_popup");
const successPopup = document.getElementById("success_popup");

class popup {
    /**
     * Show an error
     * @param {string} err_id The id of te error to show a message for, eg. use the status code or error type
     */
    static async error(err_id) {
        this._openPopup(errorPopup,
            browser.i18n.getMessage(`error_${err_id}`, Array.from(arguments).slice(1)) ||
            // No message for this error, show the default one
            browser.i18n.getMessage('error_0', err_id));
    }

    /**
     * Show a warning
     * @param {string} messageId The id of the localized string
     */
    static async warn(messageId) {
        this._openPopup(warningPopup, browser.i18n.getMessage(`warn_${messageId}`, Array.from(arguments).slice(1)));
    }

    /**
     * Show the success popup for 3 seconds
     * 
     * @param {string} [messageId] The id of the message in _locales.
     */
    static async success(messageId = "success") {
        const p = this._openPopup(successPopup, browser.i18n.getMessage(messageId));
        setTimeout(() => p.remove(), 3000);
    }

    /**
     * Actually opens the popup
     * @param {Node} popup The HTML element to open
     * @param {string} message The message to display
     */
    static _openPopup(popup, message) {
        const new_box = popup.cloneNode(true);
        new_box.querySelector(".popup_message").textContent = message;
        new_box.hidden = false;
        new_box.querySelector(".msg_bar_closebtn").onclick = this.close;
        return msgContainer.appendChild(new_box);
    }

    /**
     * Closes the parent of the close button that has been clicked
     */
    static close() {
        this.parentElement.remove();
    }

    /**
     * Close all popups that might be open
     */
    static async clear() {
        while (msgContainer.firstChild) {
            msgContainer.firstChild.remove();
        }
    }

    /**
     * Is the popup area empty (no popup currently visible)
     * @returns {boolean}
     */
    static empty() {
        return !Boolean(msgContainer.firstChild);
    }
}

/* Make jshint happy */
/* exported popup */
