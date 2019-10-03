"use strict";
/* jshint ignore:start */
const {classes:Cc,interfaces:Ci,utils:Cu,manager:Cm,results:Cr} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
/* jshint ignore:end */
//Services.console.logStringMessage("CuteButtons:\n " + "XXX");

//test if this is still needed on older versions, or if flushBundles is fine
//name.properties?' + Math.random()),
let stringBundle = Services.strings.createBundle(
                    'chrome://cutebuttons/locale/name.properties'),
aReasonWindow = null;

  function startup(aData, aReason)
  {
    //Firefox 8.0-9.0
    if (Services.appinfo.ID != "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}" &&
        Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0) {
      try {
        Cm.addBootstrappedManifestLocation(aData.installPath);
      } catch(e) {//FF 4.0-7.0
        Services.console.logStringMessage("CuteButtons:\n " +
"Know a way to load chrome.manifest without addBootstrappedManifestLocation?");
        throw (e);
      }
    }

    //make sure JSMs are fresh?
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    //same for strings on old fox?
    Services.strings.flushBundles();

    let prefsD = Services.prefs.getDefaultBranch("extensions.cutebuttons.");
    //load default prefs
    prefsD.setCharPref("cssdate","");
    prefsD.setBoolPref("buttonicons",true);
    prefsD.setBoolPref("menuicons",true);
    prefsD.setBoolPref("checkboxiconsbutton",true);
    prefsD.setBoolPref("checkboxiconsbuttonhover",true);
    if (Services.appinfo.OS == "Darwin" ||
        Services.appinfo.OS == "Linux") {
      prefsD.setBoolPref("blurdisabled",false);
      prefsD.setIntPref("mosaicnormal",0);
      prefsD.setIntPref("mosaichover",2);
      prefsD.setIntPref("mosaicnormalwhich",0);
      prefsD.setIntPref("mosaichoverwhich",2);
      //OSX: half the menuitems have checked=false, so turn these off
      //Linux: doesn't seem to have support for menuitems :hover
      //Linux: has built in checkmarks/radios that don't seem to turn off
      prefsD.setBoolPref("checkboxiconsmenu",false);
      prefsD.setBoolPref("checkboxiconsmenuhover",false);
      //they don't show up anywhere that I know of
      prefsD.setBoolPref("radioiconsmenu",false);
      prefsD.setBoolPref("radioiconsmenuhover",false);
    } else {
      prefsD.setBoolPref("blurdisabled",true);
      prefsD.setIntPref("mosaicnormal",1);
      prefsD.setIntPref("mosaichover",0);
      prefsD.setIntPref("mosaicnormalwhich",1);
      prefsD.setIntPref("mosaichoverwhich",0);
      prefsD.setBoolPref("checkboxiconsmenu",true);
      prefsD.setBoolPref("checkboxiconsmenuhover",true);
      prefsD.setBoolPref("radioiconsmenu",true);
      prefsD.setBoolPref("radioiconsmenuhover",true);
    }
    prefsD.setBoolPref("radioiconsbutton",true);
    prefsD.setBoolPref("radioiconsbuttonhover",true);
    prefsD.setBoolPref("icons",true);
    prefsD.setBoolPref("iconshover",true);
    prefsD.setBoolPref("rotateicons",true);
    prefsD.setBoolPref("statusbar",true);
    prefsD.setBoolPref("toolbarbutton",true);

    Cu.import("chrome://cutebuttons/content/common.jsm");
    Cu.import("chrome://cutebuttons/content/overlay.jsm");

    //https://github.com/dgutov/bmreplace
    cbCommon.addon = addon;
    Services.scriptloader.loadSubScript (
                    addon.getResourceURI("includes/buttons.js").spec, self
    );
    //only add icon during new install, and then only if extensions.cutebuttons.toolbarbutton = true
    if (aReason == ADDON_INSTALL &&
        cbCommon.prefs.getBoolPref("toolbarbutton") == true) {
      setDefaultPosition("cutebuttons-toolbar-button",
                        cbCommon.toolButtonLoc()[0],
                        cbCommon.toolButtonLoc()[1]);
    }

    //incase we're using _TEST version
    cbCommon.addonID = aData.id;

    // Load into any existing windows
    forEachOpenWindow(loadIntoWindow);
    // Load into any new windows
    Services.wm.addListener(WindowListener);
    //used to check if we're starting up gecko or enabling addon
    aReasonWindow = aReason;
  }

  function loadIntoWindow(window)
  {
    if (!window)
      return;

    let doc = window.document;
    //let win = doc.querySelector("window");

    if (cbCommon.prefs.getBoolPref("toolbarbutton") == true) {
      let button = cbCommon.addToolbarButton(doc);
      restorePosition(doc,button);
    }

    //only delay on gecko start
    let timeout = 0;
    if (aReasonWindow == APP_STARTUP)
      timeout = 500;

    //let firstPaint go first
    window.setTimeout(function() {
      //run some window stuff
      cbOverlay.name = stringBundle.GetStringFromName("CuteButtons");
      cbOverlay.init(window);
    },timeout);

    //but don't delay the toolbarbutton
    if (!cbOverlay.startup)
      cbOverlay.applyStyle("toolbarbutton.css",true);

    //https://github.com/dgutov/bmreplace
    unload(function() {
      if (button)
        button.parentNode.removeChild(button);
      prefHandlers.splice(handlerIdx, 1);
    }, window);
  }

  function shutdown(aData, aReason)
  {
    // When the application is shutting down we normally don't have to clean
    // up any UI changes made
    if (aReason == APP_SHUTDOWN)
      return;

    //https://github.com/dgutov/bmreplace
    unload();

    // Unload from any existing windows
    forEachOpenWindow(unloadFromWindow);
    // Stop listening for new windows
    Services.wm.removeListener(WindowListener);

    //unregister registered stylesheets
    cbOverlay.unLoadCSS();

    //correct way to remove a MutationObserver?
    //remove statusbar listener
    if (cbOverlay.mutationOb)
      cbOverlay.mutationOb.disconnect();

    //uninstall addon
    if (aReason == ADDON_UNINSTALL) {
      //remove prefs
      //why am I removing the prefs?
      //Services.prefs.getBranch("extensions.cutebuttons.").deleteBranch("");
      //delete profile\CuteButtonsSVG directory
      //fails if user has file opened, so try block it is
      try {
        cbCommon.profileDir.remove(true);
      } catch(e) {
          cbCommon.dump('Failed to remove *User Profile*\CuteButtonsSVG');
        if (e.stack)
          Cu.reportError(e.stack);
      }
    }

    //unload JSMs
    Cu.unload("chrome://cutebuttons/content/common.jsm");
    Cu.unload("chrome://cutebuttons/content/overlay.jsm");

    //support older firefoxes
    if (Services.appinfo.ID != "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}" &&
        Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0)
      Components.manager.removeBootstrappedManifestLocation(aData.installPath);

    // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
    //               in order to fully update images and locales, their caches need clearing here
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
  }

  function unloadFromWindow(window)
  {
    if (!window)
      return;

    function deleteEl(type)
    {
      let element = window.document.getElementById(type);
      if (element)
        element.parentNode.removeChild(element);
    }
    deleteEl("status4evar-status-image");
    //for some versions the toolbarbutton gets left in the toolbar
    deleteEl("cutebuttons-toolbar-button");

    //for some versions the toolbarbutton gets left in the palette
    //probably a better way to do this...
    function deletePal(type)
    {
      let toolbox = window.document.getElementById(type);
      if (!toolbox)
        return;
      for (let i = 0; i < toolbox.palette.childNodes.length; i++) {
        let item = toolbox.palette.childNodes[i];
        if (item.id == "cutebuttons-toolbar-button"){
          cbCommon.dump("===");
          try {
            item.boxObject.element.remove();
            item.remove();
          } catch(e){/*already removed, or not there so ignore*/}
        }
      }
    }
    deletePal("navigator-toolbox");
    deletePal("mail-toolbox");
  }

  function forEachOpenWindow(todo)  // Apply a function to all open browser windows
  {
    function enumWin(wintype)
    {
      let windows = Services.wm.getEnumerator(wintype);
      while (windows.hasMoreElements())
        todo(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
    }
    enumWin("navigator:browser");
    enumWin("mail:3pane");
  }

  let WindowListener = {
    onOpenWindow: function(xulWindow)
    {
      let window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                  .getInterface(Ci.nsIDOMWindow);
      function onWindowLoad()
      {
        window.removeEventListener("load",onWindowLoad);
        let element = window.document.documentElement;
        if (element.getAttribute("windowtype") == "navigator:browser" ||
            element.getAttribute("windowtype") == "mail:3pane") {
          loadIntoWindow(window);
        }
      }
      window.addEventListener("load",onWindowLoad);
    },
    onCloseWindow: function(xulWindow) {},
    onWindowTitleChange: function(xulWindow, newTitle) {}
  };

  function install(){}
  function uninstall(){}

  //https://github.com/dgutov/bmreplace
  /* jshint ignore:start */
  let self = this,
  icon,
  prefHandlers = [];

  let prefsObserver = {
    observe: function(subject, topic, data) {
      if (topic == "nsPref:changed")
        prefHandlers.forEach(function(func) {func(data);});
    }
  };

  let addon = {
    getResourceURI: function(filePath)
    {
      return {spec: __SCRIPT_URI_SPEC__ + "/../" + filePath};
    }
  };

  function $(node, childId)
  {
    if (node.getElementById)
      return node.getElementById(childId);
    else
      return node.querySelector("#" + childId);
  }
  /* jshint ignore:end */
