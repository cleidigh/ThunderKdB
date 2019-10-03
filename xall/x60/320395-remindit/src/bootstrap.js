
// https://gist.github.com/Noitidart/9088172
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

var myTimer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
var logger=Cc["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);


var ui={};
var plist={};


function startup(aData, aReason) {
    try{

	var moddir = "resource://mymodules/"; 
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                       .getService(Components.interfaces.mozIJSSubScriptLoader); 
	loader.loadSubScriptWithOptions(moddir+"ui.js",
					{"target":ui, "ignoreCache": true});
	
	loader.loadSubScriptWithOptions(moddir+"plist.js",
					{"target":plist, "ignoreCache": true});
	ui.manage(true);
	plist.start();

    }
    catch(e){
	logger.logStringMessage("error in startup: "+e.toString());
   }
}

function shutdown(aData, aReason) {
    ui.manage(false);
    plist.stop();
    

}

function install(aData, aReason) {

}

function uninstall(aData, aReason) {
}

