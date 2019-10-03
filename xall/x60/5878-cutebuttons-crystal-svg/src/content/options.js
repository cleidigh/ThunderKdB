"use strict";
/* jshint ignore:start */
const Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://cutebuttons/content/common.jsm");
Cu.import("chrome://cutebuttons/content/overlay.jsm");
/* jshint ignore:end */
//cbCommon.dump();

var cbOptions = {

  prefs: Services.prefs.getBranch("extensions.cutebuttons."),

  init: function()
  {
    //actually fix prefwindow size... (https://bugzilla.mozilla.org/show_bug.cgi?id=283697)
    //or not I give up on this crap...
    let prefwindow = document.getElementById("cutebuttons"),
    paneDeck = document
        .getAnonymousElementByAttribute(prefwindow,"class","paneDeckContainer"),
    prefpane = document
        .getElementById("prefpaneIcons");

    if (Services.appinfo.OS == "Darwin") {
      paneDeck.style.minHeight = prefpane.boxObject.height + "px";
      sizeToContent();
    }

    //load icons for tabs
    let elWin = document.getElementById("cutebuttons"),
    paneIcons = document
              .getAnonymousElementByAttribute(elWin,"pane","prefpaneIcons"),
    paneOp = document
            .getAnonymousElementByAttribute(elWin,"pane","prefpaneOptions");

    paneIcons.setAttribute("src","chrome://cutebuttons/content/Icons.png");
    paneOp.setAttribute("src","chrome://cutebuttons/content/cutebuttons32.png");

    //disable hover checkboxes if "parent" disabled
    function setDisabled(pref,element)
    {
      if (cbOptions.prefs.getBoolPref(pref) == false)
        document.getElementById(element).disabled = true;
    }

    setDisabled("checkboxiconsbutton","CheckboxButtonHover");
    setDisabled("checkboxiconsmenu","CheckboxMenuHover");
    setDisabled("radioiconsbutton","RadioButtonHover");
    setDisabled("radioiconsmenu","RadioMenuHover");
    setDisabled("icons","IconsHover");
  },

  checkboxToggle: function(child,that,childName,thatName)
  {
    //toggle disabled state of child checkbox
    let checkbox = document.getElementById(child);
    if (checkbox.disabled == true) {
      checkbox.disabled = false;
    } else {
      checkbox.disabled = true;
      checkbox.checked = false;
      //update user pref element
      let pref = document.getElementById(checkbox.getAttribute("preference"));
      pref.value = false;
    }
    //apply parent/child styles
    cbOptions.applyCSS(childName,checkbox.checked);
    cbOptions.applyCSS(thatName,that.checked);
  },

  applyCSS: function(which,toggle)
  {
    //apply the style sheets
    switch (which) {
      case "icons":
        cbOverlay.mainIconsCSS(toggle);
      break;
      case "iconshover":
        cbOverlay.applyStyle("Icons.Hover.css",toggle,true);
      break;
      case "checkboxiconsbutton":
        cbOverlay.applyStyle("Icons.CheckmarkButton.css",toggle,true);
        this.mozAppearFix("CheckmarkButtonUglyFix.css",toggle);
      break;
      case "checkboxiconsbuttonhover":
        cbOverlay.applyStyle("Icons.CheckmarkButtonHover.css",toggle,true);
      break;
      case "checkboxiconsmenu":
        cbOverlay.applyStyle("Icons.CheckmarkMenu.css",toggle,true);
      break;
      case "checkboxiconsmenuhover":
        cbOverlay.applyStyle("Icons.CheckmarkMenuHover.css",toggle,true);
      break;
      case "radioiconsbutton":
        cbOverlay.applyStyle("Icons.RadioButton.css",toggle,true);
        this.mozAppearFix("RadioButtonUglyFix.css",toggle);
      break;
      case "radioiconsbuttonhover":
        cbOverlay.applyStyle("Icons.RadioButtonHover.css",toggle,true);
      break;
      case "radioiconsmenu":
        cbOverlay.applyStyle("Icons.RadioMenu.css",toggle,true);
      break;
      case "radioiconsmenuhover":
        cbOverlay.applyStyle("Icons.RadioMenuHover.css",toggle,true);
      break;
      case "rotateicons":
        cbOverlay.applyStyle("RotateIcons.css",toggle);
      break;
      case "blurdisabled":
        cbOverlay.applyStyle("BlurDisabledIcons.css",toggle);
      break;
      case "statusbar":
        cbOverlay.statusbarCSS(toggle);
      break;
      case "buttonicons":
        cbOverlay.applyStyle("NoIconsButtons.css",toggle);
      break;
      case "menuicons":
        cbOverlay.applyStyle("NoIconsMenus.css",toggle);
      break;
    }
  },

  //ugly workaround for checkboxes/radios continuing to have the same list-style-image after you remove a CSS style
  //something to do with -moz-appearance being changed
  mozAppearFix: function(which,toggle)
  {
    //only need to do it when style is turned off
    if (toggle == true)
      return;
    //changes item's -moz-appearance to none
    cbOverlay.applyStyle(which,true);
    //then removes it after a delay
    window.setTimeout(function() {
      cbOverlay.applyStyle(which,false);
    },25);
  },

  toolbarButtonToggle: function(toggle)
  {
    Services.scriptloader.loadSubScript(cbCommon.addon
                          .getResourceURI("includes/buttons.js").spec, self);
    this.prefs.setBoolPref("toolbarbutton",toggle);
    let doc = cbCommon.getMainWindow().document,
    button;

    if (this.prefs.getBoolPref("toolbarbutton") == true) {
      setDefaultPosition("cutebuttons-toolbar-button",
                        cbCommon.toolButtonLoc()[0],
                        cbCommon.toolButtonLoc()[1]
      );
      button = cbCommon.addToolbarButton(doc);
      restorePosition(doc,button);
    } else {
      button = doc.getElementById("cutebuttons-toolbar-button");
      if (button)
        button.parentNode.removeChild(button);
    }
  },

  uninit: function()
  {
    //only fire if a mosiac has been changed
    let p = this.prefs;
    if (p.getIntPref("mosaicnormal") == p.getIntPref("mosaicnormalwhich") &&
        p.getIntPref("mosaichover") == p.getIntPref("mosaichoverwhich")) {
      return;
    }

    //need to unregister css files to have changed mosaic take effect (whenever user reloads XUL)
    cbOverlay.unLoadCSS();
    //change mosaic file
    cbCommon.mosaicCopy();

    //see above
    cbCommon.getMainWindow().setTimeout(function() {
      if (typeof cbOverlay === "undefined")//needed for TB 8.0
        Cu.import("chrome://cutebuttons/content/overlay.jsm");
      cbOverlay.loadCSS();
    },100);
  }

};
