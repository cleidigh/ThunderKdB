/*
 * Blinking Alert
 *
 * Copyright(c) 2007-2014 Iwasa Kazmi
 * All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function(window) {

    var debug = false;

    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                         .getService(Components.interfaces.nsIConsoleService);
    function log(msg) {
        if (debug) {
            consoleService.logStringMessage("Blinking Alert : " + msg);
        }
    }

    log("addEventListener");

    window.addEventListener("load", function() {
        log("onload");

        // original handlers
        var onAlertLoadOrig = window.onAlertLoad;
        var fadeOutAlertOrig = window.fadeOutAlert;
        var closeAlertOrig = window.closeAlert;

        log("onAlertLoadOrig : " + typeof(onAlertLoadOrig));
        log("fadeOutAlertOrig : " + typeof(fadeOutAlertOrig));
        log("closeAlertOrig : " + typeof(closeAlertOrig));

        // settings
        var blinkInterval = 0;
        var blinkColor = "#ff6600";
        var disableAutoHide = false;
        var closeOnClick = false;

        // original background color
        var origBackgroundColor = '';
        var hasOrigBackgroundColor = false;

        // replace fadeOutAlert()
        window.fadeOutAlert = function() {
            log("fadeOutAlert called");
            if (!disableAutoHide && fadeOutAlertOrig != null) {
                log("call original fadeOutAlert");
                fadeOutAlertOrig();
                fadeOutAlertOrig = null;
            }
        };

        // handle click event
        window.addEventListener("click", function() {
            log("onclick");
            if (closeOnClick && closeAlertOrig != null) {
                log("call original closeAlert");
                closeAlertOrig();
                closeAlertOrig = null;
            }
        }, false);

        // blinking function
        var blink2 = null;
        var blink1 = function() {
            log("blink1");
            var elem = document.getElementById("alertBox");
            if (elem) {
                if (!hasOrigBackgroundColor) {
                    origBackgroundColor = elem.style.backgroundColor;
                    hasOrigBackgroundColor = true;
                }
                elem.style.backgroundColor = blinkColor;
                setTimeout(blink2, blinkInterval);
            }
        };

        blink2 = function() {
            log("blink2");
            var elem = document.getElementById("alertBox");
            if (elem) {
                elem.style.backgroundColor = origBackgroundColor;
                setTimeout(blink1, blinkInterval);
            }
        };

        // read out our initial settings from prefs.
        try {
            var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);
            disableAutoHide = prefBranch.getBoolPref("extensions.blinkingAlert.disableAutoHide");
            blinkInterval   = prefBranch.getIntPref ("extensions.blinkingAlert.blinkInterval");
            blinkColor      = prefBranch.getCharPref("extensions.blinkingAlert.blinkColor");
            closeOnClick    = prefBranch.getBoolPref("extensions.blinkingAlert.closeOnClick");
        } catch (ex) {}

        // set time to start blinking
        if (blinkInterval > 0) {
            log("start blinking");
            setTimeout(blink1, 0);
        }
    }, false);
})(window);

