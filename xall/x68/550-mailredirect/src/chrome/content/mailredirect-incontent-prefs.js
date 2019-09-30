"use strict";

(function() {

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

const Cc = Components.classes, Ci = Components.interfaces;

Preferences.addAll([
  { id: "extensions.mailredirect.copyToSentMail", type: "bool" },
  { id: "extensions.mailredirect.addToForwardAs", type: "bool" },
  { id: "extensions.mailredirect.hideRedirectMenuitems", type: "bool" },
  { id: "extensions.mailredirect.concurrentConnections", type: "int" },
  { id: "extensions.mailredirect.defaultResentTo", type: "string" },
  { id: "extensions.mailredirect.defaultResentCc", type: "string" },
  { id: "extensions.mailredirect.defaultResentBcc", type: "string" },
  { id: "extensions.mailredirect.defaultMode", type: "string" },
  { id: "extensions.mailredirect.debug", type: "bool" },
  { id: "extensions.mailredirect.addresswidget.numRowsShownDefault", type: "int" }
]);

window.MailredirectIncontentPrefs = {

  mInitialized: false,

  onload: function()
  {
    if (!MailredirectIncontentPrefs.mInitialized) {
      var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
      var gAppInfoID = appInfo.ID;
      var gAppInfoPlatformVersion = parseInt(appInfo.platformVersion.replace(/\..*/,''));
      if (gAppInfoPlatformVersion < 70) {
        // For Thunderbird 68.* add Redirect to selector
        let paneRedirect = document.getElementById("paneRedirect");
        let buttonRedirect = (typeof document.createXULElement === "function")
          ? document.createXULElement("radio")
          : document.createElement("radio");
        buttonRedirect.setAttribute("pane", "paneRedirect");
        buttonRedirect.setAttribute("value", "paneRedirect");
        buttonRedirect.setAttribute("label", paneRedirect.getAttribute("label"));
        buttonRedirect.setAttribute("oncommand", "showPane('paneRedirect');");
        if (paneRedirect.image) {
          buttonRedirect.setAttribute("src", paneRedirect.image);
        }
        buttonRedirect.style.listStyleImage = paneRedirect.style.listStyleImage;

        let radioGroup = document.getElementById("selector");
        let buttonCompose = radioGroup.querySelector("radio[pane='paneCompose']");
        buttonCompose.after(buttonRedirect);

        if (document.documentElement.getAttribute("lastSelected") === "paneRedirect") {
          for (let button of radioGroup.getElementsByTagName("radio")) {
            if (button.getAttribute("pane") === "paneRedirect") {
              button.setAttribute("selected", "true");
            } else {
              if (button.hasAttribute("selected")) {
                button.removeAttribute("selected");
              }
            }
          }
        }

        // For Thunderbird 68.* remove Redirect category from the Composition pane
        let redirectCategory = document.getElementById("redirectCategory");
        if (redirectCategory) {
          let nextNode;
          while ((nextNode = redirectCategory.nextSibling)) {
            if (!nextNode.hasAttribute("id") || !nextNode.getAttribute("id").startsWith("redirect")) {
              // Found a node not inserted by Mail Redirect, so quit
              break;
            }
            nextNode.remove();
          }
          redirectCategory.remove();
        }
      }

      window.MailredirectPrefs.onpaneload();

      MailredirectIncontentPrefs.mInitialized = true;
    }
    window.removeEventListener("load", MailredirectIncontentPrefs.onload, false);
  }
}

})();

window.addEventListener("load", MailredirectIncontentPrefs.onload, false);
