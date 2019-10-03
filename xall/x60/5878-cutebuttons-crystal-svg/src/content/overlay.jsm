"use strict";
/* jshint ignore:start */
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("chrome://cutebuttons/content/common.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
const EXPORTED_SYMBOLS = ["cbOverlay"];
/* jshint ignore:end */
//cbCommon.dump();

var cbOverlay = {

  name: null,
  startup: null,
  addonPath: null,
  mutationOb: null,
  prefs: Services.prefs.getBranch("extensions.cutebuttons."),

  init: function(window)
  {
    //do all the fiddle faddle on first window available
    let document = window.document;

    //run once (init is called for opened windows)
    //only need to copy mosaic and apply css once
    if (!this.startup) {
      this.startup = true;
      //copy files to profile
      cbCommon.mosaicCopy();
      cbCommon.cssCopy();
      //load enabled styles
      this.loadCSS();
    }
    //not sure why I need to do this to get icons for File/Edit menu, but I do...
    if (Services.appinfo.OS == "Darwin") {
      //file menu
      document.getElementById("menu_close").removeAttribute("checked");
      //edit menu
      document.getElementById("menu_undo").removeAttribute("checked");
      //thunderbird view
      document.getElementById("menu_securityStatus").removeAttribute("checked");
      //go
      document.getElementById("menu_goForward").removeAttribute("checked");
      //tools
      document.getElementById("menu_import").removeAttribute("checked");
      //help
      document.getElementById("menu_openHelp").removeAttribute("checked");
    }

    //add image element to status4evar, and add a listener to update image label
    let statusBarText = document.getElementById("status4evar-status-text");
    if (!statusBarText || document.getElementById("status4evar-status-image"))
      return;
    let statusBarIcon = document.createElement("image");

    statusBarIcon.id = "status4evar-status-image";
    //statusBarIcon.setAttribute("label","");
    statusBarText.parentNode.insertBefore(statusBarIcon,statusBarText);
    //listener to update image label
    this.mutationOb = new window.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        statusBarIcon.setAttribute("label",mutation.target.value);
      });
    });
    this.mutationOb
          .observe(statusBarText,{attributes:true,attributeFilter:["value"]});
  },

  loadCSS: function()
  {
    let p = this.prefs;

    //main icon file
    if (p.getBoolPref("icons") == true)
      this.mainIconsCSS(true);
    //hide menu/button icons
    if (p.getBoolPref("buttonicons") == false)
      cbOverlay.applyStyle("NoIconsButtons.css",true);
    if (p.getBoolPref("menuicons") == false)
      cbOverlay.applyStyle("NoIconsMenus.css",true);
    //statusbar icons
    if (p.getBoolPref("statusbar") == true)
      this.statusbarCSS(true);
    //all the rest
    function apply(name,file,profile)
    {
      if (profile == true && p.getBoolPref(name) == true)
        cbOverlay.applyStyle(file,true);
      else if (p.getBoolPref(name) == true)
        cbOverlay.applyStyle(file,true,true);
    }
    apply("iconshover","Icons.Hover.css");
    apply("radioiconsbutton","Icons.RadioButton.css");
    apply("radioiconsbuttonhover","Icons.RadioButtonHover.css");
    apply("radioiconsmenu","Icons.RadioMenu.css");
    apply("radioiconsmenuhover","Icons.RadioMenuHover.css");
    apply("checkboxiconsbutton","Icons.CheckmarkButton.css");
    apply("checkboxiconsbuttonhover","Icons.CheckmarkButtonHover.css");
    apply("checkboxiconsmenu","Icons.CheckmarkMenu.css");
    apply("checkboxiconsmenuhover","Icons.CheckmarkMenuHover.css");
    apply("rotateicons","RotateIcons.css",true);
    apply("blurdisabled","BlurDisabledIcons.css",true);
  },

  //called from options.js and shutdown()
  unLoadCSS: function()
  {
    function apply(file,extFolder)
    {
      if (extFolder == true)
        cbOverlay.applyStyle(file,false);
      else
        cbOverlay.applyStyle(file,false,true);
    }
    apply("toolbarbutton.css");

    apply("BlurDisabledIcons.css",true);
    apply("CheckmarkButtonUglyFix.css",true);
    apply("Icons.CheckmarkButton.css");
    apply("Icons.CheckmarkButtonHover.css");
    apply("Icons.CheckmarkMenu.css");
    apply("Icons.CheckmarkMenuHover.css");
    apply("Icons.Hover.css");
    apply("Icons.Normal.css");
    apply("Icons.RadioButton.css");
    apply("Icons.RadioButtonHover.css");
    apply("Icons.RadioMenu.css");
    apply("Icons.RadioMenuHover.css");
    apply("NoIconsButtons.css",true);
    apply("NoIconsMenus.css",true);
    apply("OSXFix.css",true);
    apply("RadioButtonUglyFix.css",true);
    apply("RotateIcons.css",true);
    apply("Statusbar.css");
    apply("Statusbar-4evar.css");
    apply("UnixFix.css",true);
  },

  mainIconsCSS: function(toggle)
  {
    let osString = Services.appinfo.OS;
    cbOverlay.applyStyle("Icons.Normal.css",toggle,true);
    //fix for drop markers under linux/*BSD
    //ff 8.0 doesn't have .contains/.includes
    if (osString == "Linux" ||
        osString.search(/BSD/i) >= 0 ||
        osString == "DragonFly") {
      cbOverlay.applyStyle("UnixFix.css",toggle);
    }
    //half the menuitems under OSX have checked=false, so I need to use this to style them
    //(we normally don't style them unless options>checkbox icons>radio menu is selected)
    if (osString == "Darwin")
      cbOverlay.applyStyle("OSXFix.css",toggle);
  },

  statusbarCSS: function(toggle)
  {
    AddonManager.getAllAddons(function(aAddons) {
      for (let i = 0; i < aAddons.length; i++) {
        let a = aAddons[i];
        if (a.id == "status4evar@caligonstudios.com" ||
            a.id == "statusbar@palemoon.org") {
          if (a.isActive == true) {
            //Statusbar-4evar is installed and enabled
            cbOverlay.applyStyle("Statusbar-4evar.css",toggle,true);
            break;
          }
        } else if (Services.appinfo.ID !=
                    "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") {
          //Statusbar-4evar isn't installed; apply old style (FF has no statusbar, so it's ignored)
          cbOverlay.applyStyle("Statusbar.css",toggle,true);
          break;
        }
      }
    });
  },

  applyStyle: function(file,toggle,profile)
  {
    let sss = Cc["@mozilla.org/content/style-sheet-service;1"]
              .getService(Ci.nsIStyleSheetService),
    uri;

    if (profile) {//css file in \Profile\CuteButtonsSVG
      let cssFile = "file:///" + cbCommon
                                .getProfileFile(file).path.replace(/\\/g,"/");
      uri = Services.io.newURI(cssFile,null,null);
    } else //css file in extension directory
      uri = Services.io
                    .newURI("chrome://cutebuttons/content/" + file,null,null);
    //uri.spec

/*
      USER_SHEET has highest precedence
      AUTHOR_SHEET
      AGENT_SHEET can override stuff AUTHOR can't (scrollbars)
      user agent declarations
      user normal declarations
      author normal declarations
      author important declarations
      user important declarations
*/
    if (toggle == false) {
      if (sss.sheetRegistered(uri,sss.AGENT_SHEET))
        sss.unregisterSheet(uri,sss.AGENT_SHEET);
    } else {
      if (!sss.sheetRegistered(uri,sss.AGENT_SHEET))
        sss.loadAndRegisterSheet(uri,sss.AGENT_SHEET);
      //Note to reviewer: styles unregistered during shutdown()
    }
  }

};
