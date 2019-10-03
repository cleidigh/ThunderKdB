"use strict";
var miczSavedSearchThemAllPref = {

onLoad: function() {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.SavedSearchThemAll.");
    document.getElementById("SavedSearchThemAll.AllFromLocalFolders_checkbox").disabled=prefs.getBoolPref("ConsiderOnlySubfolders");
    document.getElementById("SavedSearchThemAll.AllFromLocalFolders_desc").disabled=prefs.getBoolPref("ConsiderOnlySubfolders");
  },

  AllFromLocalFolders_reset: function(){
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.SavedSearchThemAll.");
    prefs.setBoolPref("AllFromLocalFolders",false);
    document.getElementById("SavedSearchThemAll.AllFromLocalFolders_checkbox").disabled=document.getElementById("SavedSearchThemAll.ConsiderOnlySubfolders_checkbox").checked;
    document.getElementById("SavedSearchThemAll.AllFromLocalFolders_desc").disabled=document.getElementById("SavedSearchThemAll.ConsiderOnlySubfolders_checkbox").checked
  },
};
