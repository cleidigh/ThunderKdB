/* MIT License

Copyright (c) 2020 Johannes Endres

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. */

/* exported popup */

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
            browser.i18n.getMessage('error_0'));
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