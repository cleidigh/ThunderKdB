/*
 * Blinking Alert
 *
 * Copyright(c) 2007-2020 Iwasa Kazmi
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
((window) => {

  const debug = false;

  const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

  function log(msg) {
    if (debug) {
      Services.console.logStringMessage("Blinking Alert : " + msg);
    }
  }

  log("addEventListener");

  window.addEventListener("load", () => {
    log("onload");

    // original handlers
    let onAlertLoadOrig = window.onAlertLoad;
    let fadeOutAlertOrig = window.fadeOutAlert;
    let closeAlertOrig = window.closeAlert;

    log("onAlertLoadOrig : " + typeof (onAlertLoadOrig));
    log("fadeOutAlertOrig : " + typeof (fadeOutAlertOrig));
    log("closeAlertOrig : " + typeof (closeAlertOrig));

    // settings
    let blinkInterval = 0;
    let blinkColor = "#ff6600";
    let disableAutoHide = false;
    let closeOnClick = false;

    // read out our initial settings from prefs.
    try {
      const prefBranch = Services.prefs;
      disableAutoHide = prefBranch.getBoolPref("extensions.blinkingAlert.disableAutoHide");
      blinkInterval = prefBranch.getIntPref("extensions.blinkingAlert.blinkInterval");
      blinkColor = prefBranch.getCharPref("extensions.blinkingAlert.blinkColor");
      closeOnClick = prefBranch.getBoolPref("extensions.blinkingAlert.closeOnClick");
    } catch (ex) { }

    // replace fadeOutAlert()
    window.fadeOutAlert = () => {
      log("fadeOutAlert called");
      if (!disableAutoHide && fadeOutAlertOrig != null) {
        log("call original fadeOutAlert");
        fadeOutAlertOrig();
        fadeOutAlertOrig = null;
      }
    };

    // handle click event
    window.addEventListener("click", function () {
      log("onclick");
      if (closeOnClick && closeAlertOrig != null) {
        log("call original closeAlert");
        closeAlertOrig();
        closeAlertOrig = null;
      }
    }, false);

    // blinking function
    const blink = (origBgColor) => {
      log("blink");
      const elem = window.document.getElementById("alertBox");
      if (elem) {
        if (origBgColor !== null) {
          elem.style.backgroundColor = origBgColor;
          origBgColor = null;
        } else {
          origBgColor = elem.style.backgroundColor;
          elem.style.backgroundColor = blinkColor;
        }
        window.setTimeout(() => blink(origBgColor), blinkInterval);
      }
    };

    // start blinking
    if (blinkInterval > 0) {
      log("start blinking");
      window.setTimeout(() => blink(null), 0);
    }
  }, false);
})(window);
