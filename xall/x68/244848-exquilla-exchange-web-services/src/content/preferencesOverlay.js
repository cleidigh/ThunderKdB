/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2013 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

exquilla.prefsOverlay = (function _prefsOverlay()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;
  Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));
  let pub = {};
  let log = exquilla.Utils.ewsLog;
  let re = exquilla.Utils.re;

  const exquillaStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                            .getService(Ci.nsIStringBundleService)
                            .createBundle("chrome://exquilla/locale/exquilla.properties");

  function onLoad()
  { try {
    log.debug("exquilla.prefsOverlay.onLoad");
    if (typeof window.Preferences != "object") { // COMPAT for TB 60
      return;
    }
    // locate the "Addressing Autocompletion" groupbox
    let autocompleteGroupbox = document.getElementById("addressingAutocomplete")
                                       .parentElement.parentElement;

    // add an entry for ExQuilla accounts
    let galHbox = document.createXULElement("hbox");
    let abHbox = document.createXULElement("hbox");
    autocompleteGroupbox.appendChild(galHbox);
    autocompleteGroupbox.appendChild(abHbox);
    let galCheckbox = document.createXULElement("checkbox");
    galHbox.appendChild(galCheckbox);
    let abCheckbox = document.createXULElement("checkbox");
    abHbox.appendChild(abCheckbox);

    galHbox.setAttribute("align", "center");
    galCheckbox.setAttribute("preference", "extensions.exquilla.doAbGALAutocomplete");
    galCheckbox.setAttribute("label", exquillaStrings.GetStringFromName("useGALautocomplete"));

    abHbox.setAttribute("align", "center");
    abCheckbox.setAttribute("preference", "extensions.exquilla.doAbAutocomplete");
    abCheckbox.setAttribute("label", exquillaStrings.GetStringFromName("useABautocomplete"));

    Preferences.addAll([
      { id: "extensions.exquilla.doAbGALAutocomplete", type: "bool" },
      { id: "extensions.exquilla.doAbAutocomplete", type: "bool" },
    ]);
    } catch (e) {re(e);}}

  function onPaneLoad(event) // COMPAT for TB 60
  { try {
    let id = event.target.getAttribute("id");
    if (id != "paneCompose")
      return;
    log.debug("exquilla.prefsOverlay.onPaneLoad " + id);
    let composePreferences = document.getElementById("composePreferences");
    let galPreference = document.createElement("preference");
    galPreference.setAttribute("name", "extensions.exquilla.doAbGALAutocomplete");
    galPreference.setAttribute("id", "extensions.exquilla.doAbGALAutocomplete");
    galPreference.setAttribute("type", "bool");
    composePreferences.appendChild(galPreference);

    let abPreference = document.createElement("preference");
    abPreference.setAttribute("name", "extensions.exquilla.doAbAutocomplete");
    abPreference.setAttribute("id", "extensions.exquilla.doAbAutocomplete");
    abPreference.setAttribute("type", "bool");
    composePreferences.appendChild(abPreference);

    // locate the "Addressing Autocompletion" groupbox
    let autocompleteGroupbox = document.getElementById("addressingAutocomplete")
                                       .parentElement.parentElement;

    // add an entry for ExQuilla accounts
    let galHbox = document.createElement("hbox");
    let abHbox = document.createElement("hbox");
    autocompleteGroupbox.appendChild(galHbox);
    autocompleteGroupbox.appendChild(abHbox);
    let galCheckbox = document.createElement("checkbox");
    galHbox.appendChild(galCheckbox);
    let abCheckbox = document.createElement("checkbox");
    abHbox.appendChild(abCheckbox);

    galHbox.setAttribute("align", "center");
    galCheckbox.setAttribute("preference", "extensions.exquilla.doAbGALAutocomplete");
    galCheckbox.setAttribute("label", exquillaStrings.GetStringFromName("useGALautocomplete"));
    galCheckbox.setAttribute("checked", galPreference.value);

    abHbox.setAttribute("align", "center");
    abCheckbox.setAttribute("preference", "extensions.exquilla.doAbAutocomplete");
    abCheckbox.setAttribute("label", exquillaStrings.GetStringFromName("useABautocomplete"));
    abCheckbox.setAttribute("checked", abPreference.value);

    } catch (e) {re(e);}}

  // publically available symbols
  pub.onLoad = onLoad;
  pub.onPaneLoad = onPaneLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.prefsOverlay.onLoad();}, false);
window.addEventListener("paneload", function(event) {exquilla.prefsOverlay.onPaneLoad(event);}, false); // COMPAT for TB 60
