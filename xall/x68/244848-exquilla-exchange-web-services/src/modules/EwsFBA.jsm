/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2014 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */
 
 // Methods to manage form-based authentication
 
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
let log = Utils.ewsLog;

var EXPORTED_SYMBOLS = ["EwsFBA"];

// callback can return these values:
const FBA_FAILED = 0;    // FBA could not make sense of the webpage
const FBA_SUCCEEDED = 1; // FBA believes that login was successful
const FBA_AUTHERROR = 2; // FBA found a usable form, but authentication failed

var gTimer = null;
var gPendingCallbacks = [];

function getTabmail() {
  let mail3PaneWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator)
                .getMostRecentWindow("mail:3pane");
  return mail3PaneWindow.document.getElementById("tabmail");
}

// monitor to handle closing of fba tab
var fbaTabMonitor = {
  onTabClosing: function onTabClosing(tab) {
    if (tab.isExquillaFBA)
    {
      log.config("Exquilla FBA tab is closing");
      // if there are existing notifications, they have failed
      let callback;
      while ( (callback = gPendingCallbacks.pop()) )
        callback(FBA_FAILED);
    }
    getTabmail().unregisterTabMonitor(fbaTabMonitor);
  },
  onTabTitleChanged: function () {},
  onTabSwitched: function () {},
  onTabOpened: function () {},
  onTabPersist: function () {},
  onTabRestored: function () {},
}

// First try fba collapsed, if that fails show a tab page
function doFba(aUsername, aPassword, aUrl, aCallback)
{
  if (gPendingCallbacks.length < 5)
    gPendingCallbacks.push(aCallback);
  else
    aCallback(FBA_AUTHERROR);

  // just do expanded FBA if pref is cleared
  if (!Services.prefs.getBoolPref("extensions.exquilla.tryFbaCollapsed"))
    return doFbaExpanded(aUsername, aPassword, aUrl);

  // Scan tabs looking for an open FBA tab
  let tabmail = getTabmail();
  for (let tab of tabmail.tabInfo)
  {
    if (tab.isExquillaFBA)
    {
      tabmail.switchToTab(tab);
      return;
    }
  }

  doFbaCollapsed(aUsername, aPassword, aUrl,
    function _doFbaCallback(aStatus)
    {
      log.config("doFbaCollapsed returned status " + aStatus);
      if (aStatus == FBA_SUCCEEDED)
      {
        let callback;
        while ( (callback = gPendingCallbacks.pop()) )
          callback(aStatus);
        return;
      }

      // fbaCollapsed failed, so try fbaExpanded
      return doFbaExpanded(aUsername, aPassword, aUrl)
    });
}

// Open a content tab to process a form-based authentication request
function doFbaExpanded(aUsername, aPassword, aUrl)
{
  let activeWindow = Services.ww.activeWindow;

  let xulWindow = null;
  xulWindow = activeWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIWebNavigation)
                     .QueryInterface(Ci.nsIDocShellTreeItem).treeOwner
                     .QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIXULWindow);
  let isModal = !!(xulWindow.chromeFlags & Ci.nsIWebBrowserChrome.CHROME_MODAL);
  
  // Scan tabs looking for an open FBA tab
  let tabmail = getTabmail();
  for (let tab of tabmail.tabInfo)
  {
    if (tab.isExquillaFBA)
    {
      tabmail.switchToTab(tab);
      return;
    }
  }

  let tabOnDoneCallback = function tabOnDoneCallback(aWebProgress, aRequest)
  {
    // We are done when we see xml
    // TODO: does this also work with autodiscover?
    let contentType = aRequest.QueryInterface(Ci.nsIChannel).contentType;
    if (!(/xml/.test(contentType)))
      return;

    log.config("tabOnDoneCallback successful login, closing");
    // don't call us again
    tabProgressListener.mCallback = null;
    let callback;
    while ( (callback = gPendingCallbacks.pop()) )
      callback(FBA_SUCCEEDED);

    let tab = null;
    for (let xtab of tabmail.tabInfo)
    {
      if (xtab.isExquillaFBA)
      {
        tab = xtab;
        break;
      }
    }

    if (tab)
    {
      gTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      gTimer.initWithCallback( function() {
        tabmail.closeTab(tab);
        gTimer = null;
      }, 0, Ci.nsITimer.TYPE_ONE_SHOT);        
    }
  }

  let tabProgressListener = new ProgressListener(tabOnDoneCallback);
  tabProgressListener.onLocationChange = function onLocationChange(progress, request, location, flags)
  {
    log.config("doFbaExpanded onLocationChange " + location.spec + " flags " + flags);

    // Close early if we see Services.wsdl which is success
    if (/Services\.wsdl/.test(location.spec))
    {
      log.config("Found Services.wsdl, closing");
      tabOnDoneCallback(progress, request);
      request.cancel(Cr.NS_BINDING_ABORTED);
    }

    // find the tab
    let tab;
    for (let xtab of tabmail.tabInfo)
    {
      if (xtab.isExquillaFBA)
      {
        tab = xtab;
        break;
      }
    }

    const PRIORITY_INFO_LOW = 4;
    // show the current URL in the notification bar
    if (tab)
      tab.browser.parentNode.appendNotification(location.spec, "", 'chrome://exquilla/skin/letter-x-icon-16.png', PRIORITY_INFO_LOW);
  };

  let windowOnDoneCallback = function(aWebProgress, aRequest)
  {
    // We are done when we see xml
    // TODO: does this also work with autodiscover?
    let contentType = aRequest.QueryInterface(Ci.nsIChannel).contentType;
    if (!(/xml/.test(contentType)))
      return;

    log.debug("windowOnDoneCallback called with xml content");
    let callback;
    while ( (callback = gPendingCallbacks.pop()) )
      callback(FBA_SUCCEEDED);
    gTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    gTimer.initWithCallback( function() {
      aWebProgress.DOMWindow.close();
      gTimer = null;
    }, 0, Ci.nsITimer.TYPE_ONE_SHOT);
    Services.ww.activeWindow.removeProgressListener(windowProgressListener);
  }
  let windowProgressListener = new ProgressListener(windowOnDoneCallback);
  windowProgressListener.onLocationChange = function onLocationChange(progress, request, location, flags)
  {
    log.debug("windowProgressListener.onLocationChange location " + location.spec);
    const PRIORITY_INFO_LOW = 4;
    if (!windowProgressListener.notifyBox) {
      let window = Services.ww.activeWindow;
      windowProgressListener.notifyBox = new window.MozElements.NotificationBox(element => {
        let document = window.document;
        document.documentElement.insertBefore(element, document.documentElement.firstElementChild);
      });
    }
    // show the current URL in the notification bar
    windowProgressListener.notifyBox.appendNotification(location.spec, "", 'chrome://exquilla/skin/letter-x-icon-16.png', PRIORITY_INFO_LOW);
  };

  function onListener(aBrowser, aProgressListener) {
    aProgressListener.addProgressListener(tabProgressListener);
  }
  function setTab(tab) {
    tab.isExquillaFBA = true;
    // don't allow this tab to persist between sessions
    tab.mode.persistTab = function onPersistTab(aTab) { return null; };
  }
  let handlerRegExp = "";

  if (isModal)
  {
    let fbaWindow = Services.ww.openWindow(activeWindow, "chrome://exquilla/content/moreinfo.xhtml", "ExQuillaFBA",
                           "centerscreen,chrome,location,width=980,height=600", null);
    fbaWindow.addEventListener("load", function(e) {
        let browser = fbaWindow.document.getElementById('maincontent');
        browser.loadURI(aUrl, { triggeringPrincipal: browser.nodePrincipal });
        browser.addProgressListener(windowProgressListener, Ci.nsIWebProgress.NOTIFY_ALL);
      });
  }
  else
  {
    tabmail.registerTabMonitor(fbaTabMonitor);
    openContentTab(aUrl, handlerRegExp, 0, null, onListener, setTab);
  }
  return;
}

function doFbaCollapsed(aUsername, aPassword, aUrl, aCallback)
{
  let browser = null;

  try {
  log.config("doFbaCollapsed url " + aUrl);
  let window = Services.wm.getMostRecentWindow("mail:3pane");
  if (!window)
    window = Services.ww.activeWindow;
  browser = window.document.createXULElement("browser");
  browser.setAttribute("type", "content");
  browser.setAttribute("disablehistory", "true");
  browser.setAttribute("src", "about:blank");
  browser.setAttribute("collapsed", "true");

  window.document.documentElement.appendChild(browser);
  // Stop the inital loading of the blank document, which just confuses the listeners
  if (browser.webProgress.isLoadingDocument)
    browser.stop();

  // There are two steps to the load, an initial load to get the form, and a second
  //  load after credentials are submitted. The same progress listener will process both.
  let waitingForResponse = false;
  let fbaStatus = FBA_FAILED;
  let progressListener = new ProgressListener( function progressListenerCallback(aWebProgress, aRequest)
    { try
      {
        do {
          aWebProgress instanceof Ci.nsIDocShell;
          let domDocument = aWebProgress.contentViewer.DOMDocument;
          let contentType = domDocument.contentType;
          log.debug("progressListener callback, contentType is " + contentType);

          // What does success look like? I'm going to assume that it looks like we got
          //  back either xml content, or an autodiscover element.
          if (/xml/.test(contentType))
            fbaStatus = FBA_SUCCEEDED;
          else if (domDocument && domDocument.documentElement)
          {
            let adElements = null;
            if (domDocument.documentElement.tagName == "Autodiscover")
              adElements = [domDocument.documentElement];
            else
              adElements = domDocument.documentElement
                                      .getElementsByTagName("Autodiscover");
            if (!adElements || !adElements.length)
              adElements = domDocument.documentElement
                                      .getElementsByTagName("autodiscover");
            if (adElements && adElements.length)
              fbaStatus = FBA_SUCCEEDED;
          }
          else
            log.config("missing domElement");

          if (fbaStatus == FBA_SUCCEEDED)
          {
            // Success!
            waitingForResponse = false;
            break;
          }

          if (waitingForResponse)
          {
            waitingForResponse = false;
            // We thought we had a valid FBA form, but login failed. Maybe the
            //   username/password is incorrect?
            log.config("Waiting for response, but response invalid. Password change?");
            fbaStatus = FBA_AUTHERROR;
            break;
          }

          // try to find and set the name and passwords field
          let usernameElement = domDocument.getElementById("username");
          if (usernameElement)
            usernameElement.value = aUsername;
          else
          {
            log.config("username element not found");
            break;
          }
          let passwordElement = domDocument.getElementById("password");
          if (passwordElement)
            passwordElement.value = aPassword;
          else
          {
            log.config("password element not found");
            break;
          }

          // Try to locate the submit item. This for sure works in CookieAuth.dll which
          //  is the usual URL that we see.
          let submitElement = null;
          let inputElements = domDocument.documentElement.getElementsByTagName("input");
          if (inputElements && inputElements.length)
          {
            for (let element of inputElements)
              if (element.getAttribute("type") == "submit")
              {
                submitElement = element;
                break;
              }
          }
          else
          {
            log.config("no input elements found");
            break;
          }

          // Since the form will be passing passwords literally, require https
          if (!/^https:\/\//.test(aUrl))
          {
            log.warn("We only allow FBA to https protocol");
            break;
          }

          if (!submitElement)
          {
            log.config("no submit element found to " + aUrl);
            break;
          }
          log.config("submitting credentials");
          waitingForResponse = true;
          submitElement.click();
        } while (false);
      }
      catch (e) { waitingForResponse = false; log.error(e);}
      finally
      {
        if (!waitingForResponse)
        {
          if (fbaStatus != FBA_SUCCEEDED)
          {
            log.config("FBA failed, returning fbaStatus = " + fbaStatus);
            try {
              let responseText = stringXMLResponse(aWebProgress.contentViewer.DOMDocument);
              log.debug("FBA response text:\n" + responseText.substr(0, 2000) +
                        ((responseText.length < 2000 ? "" : " ...truncated")));
            } catch (e) {log.debug(se(e));}
          }
          window.document.documentElement.removeChild(browser);
          aCallback(fbaStatus);
        }
      }
    });
  browser.addProgressListener(progressListener,
                              Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  log.debug("browser.loadURIWithFlags for url " + aUrl);
  browser.loadURI(aUrl, { triggeringPrincipa: browser.nodePrincipal, flags: Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK });
  return;
} catch (e) {re(e);}}

// Exports

var EwsFBA = {};
EwsFBA.FBA_FAILED = FBA_FAILED;
EwsFBA.FBA_SUCCEEDED = FBA_SUCCEEDED;
EwsFBA.FBA_AUTHERROR = FBA_AUTHERROR;
EwsFBA.doFba = doFba;
