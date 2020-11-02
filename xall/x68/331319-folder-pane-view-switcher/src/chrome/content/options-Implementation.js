
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
//var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

var extension = ExtensionParent.GlobalManager.getExtension("FolderPaneSwitcher@kamens.us");

var { fpvsUtils } = ChromeUtils.import(extension.rootURI.resolve("chrome/content/utils.js"));
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
 var window =Services.wm.getMostRecentWindow("mail:3pane")
 var viewsBranch;
 var prefBranch;
var FPVSOptions = {
    mapping: [
        ["FolderPaneSwitcher-arrows-checkbox", "arrows", "bool"],
        ["FolderPaneSwitcher-delay-textbox", "delay", "int"],
        // Currently disabled
        //["FolderPaneSwitcher-drop-delay-textbox", "dropDelay", "int"],
    ],
};
var fpvs_optionsAPI = class extends ExtensionCommon.ExtensionAPI{
getAPI(context)
{
    return{
        fpvs_optionsAPI:
        {
            init  : async function(){
               fpvsUtils.init();
            },
            getViews : async function()
            {
                 var views=fpvsUtils.getViews();
             return  views;
            },
            addEventListener :async function(target, type, listener, useCapture){
                fpvsUtils.addEventListener(target, type, listener, useCapture);
            },
            getStringPref:async function(value){
                return await fpvsUtils.getStringPref(viewsBranch, value)
            },
            viewsBranch:async function(){
                var fpvsPrefRoot = "extensions.FolderPaneSwitcher.";
                var prefService = Components
                .classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService);
                  prefBranch = prefService.getBranch(fpvsPrefRoot);
                  viewsBranch = prefService.getBranch(fpvsPrefRoot + "views.");
            },
            getIntPref: async function(pref){
                return prefBranch.getIntPref(pref);
            },
            getBoolPref:async function(pref){
                return prefBranch.getBoolPref(pref);
            },
            getStringVPref:async function(pref){
                return prefBranch.getStringPref(pref);
            },
            getCharPref:async function(pref){
                return fpvsUtils.prefBranch.getCharPref(pref);
            },
            setIntPref:async function(pref,elt_value){
                prefBranch.setIntPref(pref, elt_value)
            },
            setBoolPref:async function(pref,elt_value){
                prefBranch.setBoolPref(pref, elt_value)
            },
            setStringPref:async function(pref,elt_value){
                prefBranch.setStringPref(pref, elt_value)
            },
            setCharPref:async function(pref,elt_value){
                prefBranch.setCharPref(pref, elt_value)

            }
        },

    };

}
};

