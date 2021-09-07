var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {ExtensionError} = ExtensionUtils;
/// A map of urls to the browser request windows.
var gBrowserRequests = new Map();
/// An array of browser request location listeners.
var gLocationListeners = [];
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

    this.browserListener = new BrowserListener(newURI => { // location changed
      for (let listener of gLocationListeners) {
        listener.async(this.originalURL, newURI);
      }
    }, () => { // page load completed
      for (let listener of gLoadListeners) {
        listener.async(this.originalURL);
      }
    });
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
   * Called when browserRequest.xhtml is open.
   *
   * @param aWindow      {Window}         The chrome browserRequest.xhtml window
   * @param aWebProgress {nsIWebProgress} The browser element's progress object
   */
  loaded(aWindow, aWebProgress) {
    gBrowserRequests.set(this.originalURL, aWindow);
    aWebProgress.addProgressListener(this.browserListener, Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_STATE_NETWORK);
    this.webProgress = aWebProgress;
  }
  /// Called if the user closed browserRequest.xhtml
  cancelled() {
    gBrowserRequests.delete(this.originalURL);
    this.webProgress.removeProgressListener(this.browserListener);
    for (let listener of gCloseListeners) {
      listener.async(this.originalURL);
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
BrowserListener.prototype.QueryInterface = ChromeUtils.generateQI(
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
          try { // COMPAT for TB 68
            // Sadly Firefox forgot to remove the category entry for
            // application/vnd.mozilla.xul+xml but fortunately they did
            // remove the entry for mozilla.application/cached-xul
            Services.catMan.getCategoryEntry("Gecko-Content-Viewers", "mozilla.application/cached-xul"); // COMPAT for TB 68
            Services.ww.openWindow(null, "chrome://messenger/content/browserRequest.xul", null, "chrome,centerscreen,width=980px,height=600px", new BrowserRequest(aUrl)); // COMPAT for TB 68
          } catch (ex) { // COMPAT for TB 68
            Services.ww.openWindow(null, "chrome://messenger/content/browserRequest.xhtml", null, "chrome,centerscreen,width=980px,height=600px", new BrowserRequest(aUrl));
          } // COMPAT for TB 68
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
        onCommitted: new ExtensionCommon.EventManager({ context, name: "request.onCommitted", register: (listener, scheme) => {
          gLocationListeners.push(listener);
          return () => {
            gLocationListeners.splice(gLocationListeners.indexOf(listener), 1);
          };
        }}).api(),
        onCompleted: new ExtensionCommon.EventManager({ context, name: "request.onCompleted", register: (listener, scheme) => {
          gLoadListeners.push(listener);
          return () => {
            gLoadListeners.splice(gLoadListeners.indexOf(listener), 1);
          };
        }}).api(),
        onClosed: new ExtensionCommon.EventManager({ context, name: "request.onClosed", register: (listener, scheme) => {
          gCloseListeners.push(listener);
          return () => {
            gCloseListeners.splice(gCloseListeners.indexOf(listener), 1);
          };
        }}).api(),
      }
    };
  }
};
