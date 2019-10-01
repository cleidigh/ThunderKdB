var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {XPCOMUtils} = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var QIUtils = ChromeUtils.generateQI ? ChromeUtils : XPCOMUtils; // COMPAT for TB 60

var {ExtensionError} = ExtensionUtils;
/// A map of urls to the browser request windows.
var gBrowserRequests = new Map();
/// An array of browser request load listeners.
var gLoadListeners = [];
/// An array of browser request close listeners.
var gCloseListeners = [];

/**
 * This object implements the API required by browserRequest.js
 */
class BrowserRequest {
  constructor(aUrl) {
    // {string} url
    this.originalURL = aUrl;
    // {string} url
    this.currentURL = null,
    // {Array of {string} url}
    this.browsingHistory = [];

    this.browserListener = new BrowserListener(newURI => { // location changed
      this.browsingHistory.push(newURI);
      this.currentURL = newURI;
    }, () => { // page load completed
      for (let listener of gLoadListeners) {
        listener.async(this.originalURL);
      }
    });
    //console.log(this.browserListener.QueryInterface(Ci.nsIWebProgressListener));
  }
  /// This allows browserRequest.js to access us after passing through XPCOM.
  get wrappedJSObject() {
    return this;
  }
  /// Nobody uses this, but browserRequest.js tests for it.
  get iconURI() {
    return "";
  }
  /// Provide the initial url to browserRequest.js
  get url() {
    return this.originalURL;
  }
  /// Only used if no url is provided
  get promptText() {
    return "";
  }
  /**
   * Called when browserRequest.xul is open.
   *
   * @param aWindow      {Window}         The chrome browserRequest.xul window
   * @param aWebProgress {nsIWebProgress} The browser element's progress object
   */
  loaded(aWindow, aWebProgress) {
    gBrowserRequests.set(this.originalURL, aWindow);
    aWebProgress.addProgressListener(this.browserListener, Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_STATE_NETWORK);
    this.webProgress = aWebProgress;
  }
  /// Called if the user closed browserRequest.xul
  cancelled() {
    gBrowserRequests.delete(this.originalURL);
    this.webProgress.removeProgressListener(this.browserListener);
    for (let listener of gCloseListeners) {
      listener.async(this.originalURL, this.currentURL, this.browsingHistory);
    }
  }
}

class BrowserListener {
  constructor(locationCallback, completeCallback) {
    this._locationCallback = locationCallback;
    this._completeCallback = completeCallback;
  }
  onLocationChange(aWebProgress, aRequest, aURI, aFlag) {
    //let win = aWebProgress.DOMWindow;
    console.log("Loaded page <" + aURI.spec + ">");
    this._locationCallback(aURI.spec, aWebProgress);
  }
  onProgressChange(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) {}
  onStateChange(aWebProgress, aRequest, aFlag, aStatus) {
    if (aWebProgress && aWebProgress.isTopLevel && aFlag & Ci.nsIWebProgressListener.STATE_STOP) {
      this._completeCallback();
    }
  }
  onStatusChange(aWebProgress, aRequest, aStatus, aMessage) {}
  onSecurityChange(aWebProgress, aRequest, aState) {}
  onContentBlockingEvent(aWebProgress, aRequest, aEvent) {}
}
BrowserListener.prototype.QueryInterface = QIUtils.generateQI(
    ["nsIWebProgressListener", "nsISupportsWeakReference"]);

this.request = class extends ExtensionAPI {
  getAPI(context) {
    return {
      request: {
        open: function(aUrl) {
          if (gBrowserRequests.has(aUrl)) {
            throw new ExtensionError("Attempt to reopen existing browser request");
          }
          gBrowserRequests.set(aUrl, null);
          Services.ww.openWindow(null, "chrome://messenger/content/browserRequest.xul", null, "chrome,centerscreen,width=980px,height=600px", new BrowserRequest(aUrl));
        },
        executeScript: async function(aUrl, aCode) {
          if (!gBrowserRequests.has(aUrl)) {
            throw new ExtensionError("Attempt to execute script in nonexistent browser request");
          } else if (!gBrowserRequests.get(aUrl)) {
            throw new ExtensionError("Attempt to execute script in loading browser request");
          } else {
            let window = gBrowserRequests.get(aUrl);
            let content = window.document.getElementById("requestFrame").contentWindow;
            // This API is only supposed to be used after the page has loaded,
            // so first ensure that it has in fact loaded.
            if (content.document.readyState != "complete") {
              await new Promise(resolve => content.document.addEventListener("load", resolve, { once: true, passive: true }));
            }
            let sandbox = Cu.Sandbox(content, {
              sandboxPrototype: content,
              sameZoneAs: content,
              wantXrays: true,
              isWebExtensionContentScript: true,
            });
            try {
              return [Cu.evalInSandbox(aCode, sandbox)];
            } catch (ex) {
              throw SanitiseException(ex);
            }
          }
        },
        close: function(aUrl) {
          if (!gBrowserRequests.has(aUrl)) {
            throw new ExtensionError("Attempt to close nonexistent browser request");
          } else if (!gBrowserRequests.get(aUrl)) {
            throw new ExtensionError("Attempt to close loading browser request");
          } else {
            gBrowserRequests.get(aUrl).close();
            gBrowserRequests.delete(aUrl);
          }
        },
        onCompleted: new ExtensionCommon.EventManager(context, "request.onCompleted", (listener, scheme) => {
          gLoadListeners.push(listener);
          return () => {
            gLoadListeners.splice(gLoadListeners.indexOf(listener), 1);
          };
        }).api(),
        onClosed: new ExtensionCommon.EventManager(context, "request.onClosed", (listener, scheme) => {
          gCloseListeners.push(listener);
          return () => {
            gCloseListeners.splice(gCloseListeners.indexOf(listener), 1);
          };
        }).api(),
      }
    };
  }
};
