var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var recentWindow = Services.wm.getMostRecentWindow("mail:3pane");

var configButtonApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      configButtonApi: {
        async configButton() {
          let navigationToolbox = recentWindow.document.getElementById("navigation-toolbox");
          let configButton = recentWindow.document.getElementById("configbutton_dillinger-browserAction-toolbarbutton");

          if (navigationToolbox.getAttribute("aboutConfigInTab") == "true") {
            recentWindow.openContentTab("about:config");
          } else {
            recentWindow.openDialog("about:config","","width=800,height=600");
          }
        },
        async loadButton() {
          ExtensionSupport.registerWindowListener("configButtonListener", {
            chromeURLs: [
              "chrome://messenger/content/messenger.xhtml",
            ],
            onLoadWindow(recentWindow) {
              let navigationToolbox = recentWindow.document.getElementById("navigation-toolbox");
              let configButton = recentWindow.document.getElementById("configbutton_dillinger-browserAction-toolbarbutton");

              let configButtonPopup = recentWindow.document.createXULElement("menupopup");
              configButtonPopup.id = "configButtonPopup";

              let configButtonInTab = recentWindow.document.createXULElement("menuitem");
              configButtonInTab.id = "configButtonInTab";
              configButtonInTab.setAttribute("type", "checkbox");
              configButtonInTab.setAttribute("label", "Config Editor In Tab");
              configButtonInTab.setAttribute("tooltiptext", "Display the Config Editor in a new tab");
              configButtonInTab.addEventListener("command", () => setConfigButton());

              let configButtonPopupSeparator = recentWindow.document.createXULElement("menuseparator");
              configButtonPopupSeparator.id = "configButtonPopupSeparator";

              configButtonPopup.append(configButtonPopupSeparator);
              configButtonPopup.append(configButtonInTab);
              configButtonPopup.setAttribute("onpopupshowing", "calendarOnToolbarsPopupShowing(event);");

              recentWindow.mainPopupSet.append(configButtonPopup);
              configButton.setAttribute("context", "configButtonPopup");

              navigationToolbox.setAttribute("persist", "aboutConfigInTab");

              if (navigationToolbox.getAttribute("aboutConfigInTab") == "true") {
                configButtonInTab.setAttribute("checked", true);
              } else {
                configButtonInTab.removeAttribute("checked");
              }

              function setConfigButton() {
              let configButton = recentWindow.document.getElementById("configbutton_dillinger-browserAction-toolbarbutton");
                if (navigationToolbox.getAttribute("aboutConfigInTab") == "true") {
                  navigationToolbox.removeAttribute("aboutConfigInTab");
                } else {
                  navigationToolbox.setAttribute("aboutConfigInTab", true);
                }
              }
              console.log("configButton loaded");
            },
          });
        },
      },
    };
  }

  onShutdown(isAppShutdown) {
  if (isAppShutdown) return;

  for (let window of Services.wm.getEnumerator("mail:3pane")) {
    let configButton = window.document.getElementById("configButton");
    if (configButton) {
      configButton.remove();
    }
    let configButtonPopup = window.document.getElementById("configButtonPopup");
    if (configButtonPopup) {
      configButtonPopup.remove();
    }
    let configButtonInTab = window.document.getElementById("configButtonInTab");
    if (configButtonInTab) {
      configButtonInTab.remove();
    }
    let navigationToolbox = window.document.getElementById("navigation-toolbox");
    if (navigationToolbox) {
      navigationToolbox.removeAttribute("persist");
    }
  }
    ExtensionSupport.unregisterWindowListener("configButtonListener");
    Services.obs.notifyObservers(null, "startupcache-invalidate");
    console.log("configButton unloaded");
  }
};
