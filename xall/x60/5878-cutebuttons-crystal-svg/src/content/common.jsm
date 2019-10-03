"use strict";
/* jshint ignore:start */
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
const EXPORTED_SYMBOLS = ["cbCommon"];
/* jshint ignore:end */
//cbCommon.dump();

var cbCommon = {

  //populated from bootstrap.js
  addon: null,
  addonID: null,

  nameSTR: Services.strings
                  .createBundle('chrome://cutebuttons/locale/name.properties'),
  prefs: Services.prefs.getBranch("extensions.cutebuttons."),
  profileDir: FileUtils.getDir("ProfD",["CuteButtonsSVG"],true),

  getProfileFile: function(file)
  {
    return FileUtils.getFile("ProfD",["CuteButtonsSVG",file]);
  },

  getAddonFile: function(file)
  {
    return FileUtils
            .getFile("ProfD",["extensions",cbCommon.addonID,"content",file]);
  },

  addToolbarButton: function(doc)
  {
    // Add toolbar button
    let button = doc.createElement("toolbarbutton");
    button.setAttribute("id","cutebuttons-toolbar-button");
    button.setAttribute("label",this.nameSTR.GetStringFromName("CuteButtons"));
    button.setAttribute("class",
                        "toolbarbutton-1 chromeclass-toolbar-additional");
    button.addEventListener('click',function(event) {
      //Services: needed for TB 8.0
      cbCommon.openOptions(event.button,Services);
    }, false);
    return button;
  },

  //default position to store toolbarbutton
  toolButtonLoc: function()
  {
    switch (Services.appinfo.ID) {
      case "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}": //PaleMoon
        return ["nav-bar","urlbar-display-box"];
      case "{3550f703-e582-4d05-9a08-453d09bdfdc6}": //ThunderBird
        return ["mail-toolbar-menubar2","menubar-items"];
      case "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}": //SeaMonkey
        return ["nav-bar","nav-bar-inner"];
      default: //FireFox (probably)
        if (Services.vc.compare(Services.appinfo.version, "29.*") >= 0)
          return ["nav-bar-customization-target","urlbar-container"];
        else //FF < 29
          return ["nav-bar","urlbar-container"];
    }
  },

  //open options dialog from toolbarbutton
  openOptions: function(button,Services)
  {
    //ignore unless left click
    if (button != 0)
      return;
    //if options already opened then focus
    let em = Services.wm.getMostRecentWindow("cutebuttonsOptionsWindow");
    if (em)
      em.focus();
    else
      this.getMainWindow()
            .openDialog("chrome://cutebuttons/content/options.xul");
  },

  //copy file from ext dir to profile dir
  copyFile: function(fileAddon,fileProfile,name)
  {
    //remove old file and copy new one over
    try {
      //checking for file existence means an extra file operation (less = better)
      fileProfile.remove(false);
    } catch(e) {
      //so we just ignore error if file doesn't exist
    }
    //copyTo doesn't let you overwrite existing files, so we had to do the above
    fileAddon.copyTo(this.profileDir,name);
  },

  //copy over css files from addon to profile directory, if dates are newer
  cssCopy: function()
  {
    function copyCSS(file)
    {
      let fileAddon = cbCommon.getAddonFile(file),
      fileProfile = cbCommon.getProfileFile(file);

      cbCommon.copyFile(fileAddon,fileProfile,file);
    }
    function filelist()
    {
      copyCSS("Icons.Normal.css");
      copyCSS("Icons.Hover.css");
      copyCSS("Icons.CheckmarkButton.css");
      copyCSS("Icons.CheckmarkButtonHover.css");
      copyCSS("Icons.CheckmarkMenu.css");
      copyCSS("Icons.CheckmarkMenuHover.css");
      copyCSS("Icons.RadioButton.css");
      copyCSS("Icons.RadioButtonHover.css");
      copyCSS("Icons.RadioMenu.css");
      copyCSS("Icons.RadioMenuHover.css");
      copyCSS("Statusbar-4evar.css");
      copyCSS("Statusbar.css");
    }

    let cssFileProfile = cbCommon.getProfileFile("Icons.Normal.css"),
    cssFileAddon = cbCommon.getAddonFile("Icons.Normal.css");

    //check if file doesn't exist, if so copy files over
    if (cssFileProfile.exists() == false) {
      filelist();
    //check if stored date and addon file date are different
    } else if (cssFileAddon.lastModifiedTime !=
                                          this.prefs.getCharPref("cssdate")) {
      filelist();
      //add date of addon file to pref for next startup check above
      //lets people edit files in \Profile\CuteButtonsSVG
      //well, really lets me send people edited files without having to sign the ext...
      this.prefs.setCharPref("cssdate",cssFileAddon.lastModifiedTime);
    }

    //check for the old (pre v0.4.7) files, and remove them
    try {
      cbCommon.getProfileFile("Icons.css").remove(false);
      //when ^ is missing it'll fail, so the below won't do anything
      cbCommon.getProfileFile("CheckmarkIcons.css").remove(false);
      cbCommon.getProfileFile("Menubar.css").remove(false);
      cbCommon.getProfileFile("RadioIcons.css").remove(false);
    } catch(e) {/*don't care*/}
  },

  //copy over css files from addon to profile directory, if dates are newer (or user switched mosaic file)
  mosaicCopy: function()
  {
    let m = this.mosaicFile,
    mosaicNormal = this.prefs.getIntPref("mosaicnormal"),
    mosaicHover = this.prefs.getIntPref("mosaichover");

    switch (mosaicNormal) {
      case 0:
        m("mosaic.normal.png",mosaicNormal,1);
      break;
      case 1:
        m("mosaic.faded.png",mosaicNormal,1);
      break;
      case 2:
        m("mosaic.brighter.png",mosaicNormal,1);
      break;
      case 3:
        m("mosaic.gray.png",mosaicNormal,1);
      break;
    }

    switch (mosaicHover) {
      case 0:
        m("mosaic.normal.png",mosaicHover);
      break;
      case 1:
        m("mosaic.faded.png",mosaicHover);
      break;
      case 2:
        m("mosaic.brighter.png",mosaicHover);
      break;
      case 3:
        m("mosaic.gray.png",mosaicHover);
      break;
    }
  },

  mosaicFile: function(nameAddon,mosaic,filename)
  {
    let nameProfile,
    pref;
    if (filename) {
      nameProfile = "mosaic.png";
      pref = "mosaicnormalwhich";
    } else {
      nameProfile = "mosaic.hover.png";
      pref = "mosaichoverwhich";
    }
    let fileAddon = cbCommon.getAddonFile(nameAddon),
    fileProfile = cbCommon.getProfileFile(nameProfile);

    if (cbCommon.prefs.getIntPref(pref) != mosaic) {
      //numbers don't match; no need to check file existence/date, just copy and call it a day (mosaic changed)
      cbCommon.copyFile(fileAddon,fileProfile,nameProfile);
      //update mosaicWhich so we aren't copying the same file all the time
      cbCommon.prefs.setIntPref(pref,mosaic);
    } else if (fileProfile.lastModifiedTime != fileAddon.lastModifiedTime) {
      //profile file time is different from addon file time (extension updated)
      cbCommon.copyFile(fileAddon,fileProfile,nameProfile);
    } else if (fileProfile.exists() == false) {
      //if it doesn't exist (first run)
      fileAddon.copyTo(cbCommon.profileDir,nameProfile);
    }
  },

  //get the first window available
  getMainWindow: function()
  {
    let wm = Services.wm.getMostRecentWindow,
    mainWin = wm("navigator:browser");//Firefox/Palemoon/Seamonkey

    if (!mainWin)
      mainWin = wm("mail:3pane");//thunderbird
    return mainWin;
  },

  dump: function(aString)
  {
    try {
      Services.console.logStringMessage("CuteButtons:\n " + aString);
    } catch(e) {
      this.catchError(e);
    }
  },

  catchError: function(e)
  {
    //http://blogger.ziesemer.com/2007/10/javascript-debugging-in-firefox.html
    try {
      if (e.stack)
        Cu.reportError(e.stack);
    } finally {
      //throw e;
      return null;
    }
  }

};
