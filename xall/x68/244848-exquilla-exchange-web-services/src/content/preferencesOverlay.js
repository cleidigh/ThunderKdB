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
    // locate the "Addressing Autocompletion" groupbox
    let addressingCheckbox = document.getElementById("addressingAutocomplete");
    let autocompleteGroupbox = addressingCheckbox.parentElement.parentElement;
    let autocompleteSeparator = addressingCheckbox.parentElement.nextElementSibling.nextElementSibling;
    // add an entry for ExQuilla accounts
    let galHbox = document.createXULElement("hbox");
    let abHbox = document.createXULElement("hbox");
    autocompleteGroupbox.insertBefore(galHbox, autocompleteSeparator);
    autocompleteGroupbox.insertBefore(abHbox, autocompleteSeparator);
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

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.prefsOverlay.onLoad();}, false);
