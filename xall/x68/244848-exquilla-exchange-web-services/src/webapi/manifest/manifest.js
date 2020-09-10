var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {AddonManager} = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
var {ExtensionError} = ExtensionUtils;
Cu.importGlobalProperties(["XMLHttpRequest"]);
var gResProtocolHandler = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
var gDefaultPrefs = Services.prefs.getDefaultBranch("");
var gRegisteredDocuments = new Map();
var gRegisteredOverlays = new Map();

function notifyNeedsRestart() {
  Services.obs.notifyObservers(null, "startupcache-invalidate");
  let window = Services.wm.getMostRecentWindow("mail:3pane");
  if (!window) {
    return;
  }
  let document = window.document;
  let notificationBox;
  let boxEl = document.getElementById("exquilla-notification-box");
  if (boxEl) {
    if (boxEl._notificationBox) {
      notificationBox = boxEl._notificationBox;
      if (notificationBox.getNotificationWithValue("exquilla_needs_restart")) {
        return;
      }
    } else {
      // This is an upgrade from a previous version of ExQuilla
      boxEl.remove();
    }
  }
  if (!notificationBox) {
    notificationBox = new window.MozElements.NotificationBox(element => {
      element.id = "exquilla-notification-box";
      element.setAttribute("notificationside", "top");
      document.documentElement.insertBefore(element,
        document.getElementById("navigation-toolbox").nextSibling);
    });
  }
  let brand = Services.strings.createBundle("chrome://branding/locale/brand.properties").GetStringFromName("brandShortName");
  let needsRestart, restartNow;
  try {
    // For an in-place upgrade, the existing chrome registration may actually
    // point to our new locale file. So just in case, let's flush the bundles.
    Services.strings.flushBundles();
    let bundle = Services.strings.createBundle("chrome://exquilla/locale/exquilla.properties");
    needsRestart = bundle.formatStringFromName("needsRestart", [brand], 1);
    restartNow = bundle.GetStringFromName("restartNow");
  } catch (ex) {
    let bundle = Services.strings.createBundle("chrome://messenger/locale/addons.properties");
    needsRestart = bundle.formatStringFromName("addonPostInstall.restartRequired.message", [brand], 1);
    restartNow = bundle.GetStringFromName("addonPostInstall.restart.label");
  }
  notificationBox.appendNotification(needsRestart, "exquilla_needs_restart",
    "chrome://exquilla/skin/letter-x-icon-16.png",
    notificationBox.PRIORITY_WARNING_LOW, [{
      label: restartNow,
      value: "exquilla_restart_now",
      callback() {
        let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested", null);
        if (!cancelQuit.data) {
          Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
        }
        return true;
      },
    }]);
}

this.manifestLoader = class extends ExtensionAPI {
  getAPI(context) {
    return {
      manifestLoader: {
        needsRestart(aRoot) {
          if (gResProtocolHandler.hasSubstitution(aRoot)) {
            notifyNeedsRestart();
            return true;
          }
          return false;
        },
        registerResourceMapping(aRoot, aPath) {
          let uri = Services.io.newURI(aPath, null, context.extension.rootURI);
          gResProtocolHandler.setSubstitution(aRoot, uri);
        },
        registerComponent(aClassID, aContractID, aPath) {
          try {
            let classID = Components.ID(aClassID);
            let factory = aPath && ChromeUtils.import(context.extension.rootURI.resolve(aPath)).NSGetFactory(classID);
            Components.manager.QueryInterface(Ci.nsIComponentRegistrar).registerFactory(classID, "", aContractID, factory);
          } catch (ex) {
            Cu.reportError(ex);
            throw new ExtensionError("Exquilla cannot be enabled twice in one session");
          }
        },
        registerCategory(aCategory, aEntry, aValue) {
          try {
            Services.catMan.addCategoryEntry(aCategory, aEntry, aValue, false, true);
          } catch (ex) {
            Cu.reportError(ex);
            throw new ExtensionError("Exquilla cannot be enabled twice in one session");
          }
        },
        registerPreference(aPreference, aDefault) {
          switch (typeof aDefault) {
          case "boolean":
            gDefaultPrefs.setBoolPref(aPreference, aDefault);
            return;
          case "string":
            gDefaultPrefs.setStringPref(aPreference, aDefault);
            return;
          default:
            if (Number.isInteger(aDefault)) {
              gDefaultPrefs.setIntPref(aPreference, aDefault);
              return;
            }
            throw new ExtensionError("Invalid preference value passed to registerPreference");
          }
        },
        loadChromeManifest() {
          try {
            let uri = context.extension.rootURI;
            if (uri instanceof Ci.nsINestedURI) {
              uri = uri.innermostURI;
            }
            Components.manager.addBootstrappedManifestLocation(uri.QueryInterface(Ci.nsIFileURL).file);
            AddonManager.addAddonListener({
              onDisabled(addon) {
                if (addon.id == "exquilla@mesquilla.com") {
                  notifyNeedsRestart();
                }
              },
            });
          } catch (ex) {
            Cu.reportError(ex);
            throw new ExtensionError("Exquilla cannot be enabled twice in one session");
          }
        },
        registerOverlay(aDocumentURI, aOverlayURI) {
          if (!gRegisteredDocuments.has(aDocumentURI)) {
            gRegisteredDocuments.set(aDocumentURI, []);
          }
          gRegisteredDocuments.get(aDocumentURI).push(aOverlayURI);
          for (let window of Services.ww.getWindowEnumerator()) {
            let docShell = window.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);
            let enumerator = docShell.getDocShellEnumerator ? "getDocShellEnumerator" : "getAllDocShellsInSubtree";
            for (let descendant of docShell[enumerator](Ci.nsIDocShellTreeItem.typeAll, Ci.nsIDocShell.ENUMERATE_FORWARDS)) {
              let document = descendant.QueryInterface(Ci.nsIWebNavigation).document;
              if (document.readyState != "loading" && document.documentURIObject.prePath + document.documentURIObject.filePath == aDocumentURI) {
                mergeDocument(document, aOverlayURI);
              }
            }
          }
        },
      },
    };
  }
};

function mergeElement(aDocument, aTarget, aElement) {
  for (let attr of aElement.attributes) {
    if (aTarget.getAttribute(attr.name) != attr.value) {
      aTarget.setAttribute(attr.name, attr.value);
    }
  }
  for (let child of aElement.children) {
    if (child.id) {
      let mergeTarget = aDocument.getElementById(child.id);
      if (mergeTarget && mergeTarget.parentElement == aTarget) {
        mergeElement(aDocument, child);
        continue;
      }
    }
    let importedNode = aDocument.importNode(child, true);
    let insertbefore = child.getAttribute("insertbefore");
    if (insertbefore) {
      let insert = aDocument.getElementById(insertbefore);
      if (insert && insert.parentElement == aTarget) {
        aTarget.insertBefore(importedNode, insert);
        continue;
      }
    }
    aTarget.appendChild(importedNode);
  }
}

function mergeDocument(aDocument, aOverlayURI) {
  let overlay = gRegisteredOverlays.get(aOverlayURI);
  if (!overlay) {
    let xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/xml");
    xhr.open("GET", aOverlayURI, false);
    xhr.channel.owner = Services.scriptSecurityManager.getSystemPrincipal();
    xhr.send(null);
    overlay = xhr.responseXML;
    gRegisteredOverlays.set(aOverlayURI, overlay);
  }
  for (let node of overlay.childNodes) {
    if (node.nodeType == node.PROCESSING_INSTRUCTION_NODE &&
        node.target == "xml-stylesheet") {
      aDocument.insertBefore(aDocument.importNode(node), aDocument.documentElement);
    }
  }
  for (let child of overlay.documentElement.children) {
    if (child.id) {
      let mergeTarget = aDocument.getElementById(child.id);
      if (mergeTarget) {
        mergeElement(aDocument, mergeTarget, child);
        continue;
      }
    }
    let insertbefore = child.getAttribute("insertbefore");
    if (insertbefore) {
      let insert = aDocument.getElementById(insertbefore);
      if (insert) {
        insert.parentElement.insertBefore(aDocument.importNode(child, true), insert);
      }
    }
  }
  let addEventListener = aDocument.defaultView.addEventListener;
  aDocument.defaultView.addEventListener = function(aEvent, aListener, aFlags) {
    if (aEvent == "DOMContentLoaded" ||
        (aEvent == "load" && aDocument.readyState == "complete")) {
      aDocument.defaultView.setTimeout(aListener, 0);
    } else {
      addEventListener(aEvent, aListener, aFlags);
    }
  };
  for (let element of overlay.documentElement.children) {
    if (element.localName == "script" && element.hasAttribute("src")) {
      Services.scriptloader.loadSubScript(element.getAttribute("src"), aDocument.defaultView);
    }
  }
  delete aDocument.defaultView.addEventListener;
}

function overlayDocument(aDocument) {
  if (!aDocument.defaultView) {
    return;
  }
  let url = aDocument.documentURIObject.prePath + aDocument.documentURIObject.filePath;
  let overlays = gRegisteredDocuments.get(url);
  if (overlays) {
    for (let overlay of overlays) {
      mergeDocument(aDocument, overlay);
    }
  }
}

Services.obs.addObserver(overlayDocument, "chrome-document-interactive");
