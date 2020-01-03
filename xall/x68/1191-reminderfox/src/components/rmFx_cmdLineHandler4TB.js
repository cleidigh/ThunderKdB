/**
 * rmFx_cmdLineHandler4TB.js //gW - 2008-0-05
 * rmFx_cmdLineHandler4TB.js //gW - 2011-07-12 16:37
 * 
 * 
 * @see https://developer.mozilla.org/en/Chrome/Command_Line
 * @see https://developer.mozilla.org/en/XPCOM/XPCOM_changes_in_Gecko_2.0
 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", this);
//Components.utils.import("resource:///modules/XPCOMUtils.jsm");

/**
 * The XPCOM component that implements nsICommandLineHandler. It also implements
 * nsIFactory to serve as its own singleton factory.
 */
function reminderFoxHandler (){
};

	reminderFoxHandler.prototype = {

		nsICategoryManager : Components.interfaces.nsICategoryManager,
		nsIComponentRegistrar : Components.interfaces.nsIComponentRegistrar,
		nsIModule : Components.interfaces.nsIModule,

		nsICommandLineHandler : Components.interfaces.nsICommandLineHandler,
		nsIFactory : Components.interfaces.nsIFactory,
		nsIWindowWatcher : Components.interfaces.nsIWindowWatcher,

		nsISupports : Components.interfaces.nsISupports,
		nsISupportsString : Components.interfaces.nsISupportsString,

		contractID : "@mozilla.org/commandlinehandler/general-startup;1?type=reminderfox",
		classID : Components.ID("{a52fd100-4b89-11dd-ae16-0800200c9a66}"),
		category : "m-reminderfox",


		/* nsISupports */
		QueryInterface : function (iid) {
			if (iid.equals(this.nsICommandLineHandler) || iid.equals(this.nsIFactory) 
					|| iid.equals(this.nsIModule) || iid.equals(this.nsISupports))
				return this;
			throw Components.results.NS_ERROR_NO_INTERFACE;
		},


		/* nsIModule */
		getClassObject : function (compMgr, cid, iid) {
			if (cid.equals(this.classID))
				return reminderFoxHandler.QueryInterface(iid);

			throw Components.results.NS_ERROR_NOT_REGISTERED;
		},


		registerSelf : function (compMgr, fileSpec, location, type) {
			compMgr.QueryInterface(this.nsIComponentRegistrar);

			compMgr.registerFactoryLocation(this.classID, this.category,
					this.contractID, fileSpec, location, type);

			var catMan = Components.classes["@mozilla.org/categorymanager;1"]
					.getService(this.nsICategoryManager);
			catMan.addCategoryEntry("command-line-handler", this.category,
					this.contractID, true, true);
		},


		unregisterSelf : function (compMgr, alocation, type) {
			compMgr.QueryInterface(this.nsIComponentRegistrar);
			compMgr.unregisterFactoryLocation(this.classID, alocation);
	
			var catMan = Components.classes["@mozilla.org/categorymanager;1"]
					.getService(this.nsICategoryManager);
			catMan.deleteCategoryEntry("command-line-handler", this.category);
		},


		canUnload : function(compMgr) {
			return true;
		},


		/* nsISupports */
		QueryInterface : function (iid) {
			if (iid.equals(this.nsICommandLineHandler) || iid.equals(this.nsIFactory)
					|| iid.equals(this.nsISupports))
			return this;

			throw Components.results.NS_ERROR_NO_INTERFACE;
		},


/*
  *	@call  'messenger' -reminderFox {remoteId}:{remoteOp} -msgString {string}
  *
  *	@call  'messenger' -reminderFox UID:{refID}             -msgString {file path}
  *	@call  'messenger' -reminderFox COMPOSE:{reminderID}    -msgString {file path of attachment}
  *	@call  'messenger' -reminderFox msgID:{finalMessageId}  -msgString:{finalMessageId}
*/
		helpInfo : " -reminderFox {remoteID}   open TB with reminderFox options\n" 
				+   " specific actions \n",


		/* nsICommandLineHandler */
		//    thunderbird -reminderFox -msgID:4755317C.2080205@web.de
		handle : function (cmdLine) {

			dump ("ReminderFox  clh(1)  {rmFx_cmdLine: " + cmdLine + "}\n");
			var rmFx_startupID = cmdLine.handleFlagWithParam("reminderFox", false);
			if (!rmFx_startupID) return;

			var msgString = cmdLine.handleFlagWithParam("msgString", false);
			if (!msgString) return;

			var wwatch = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
					.getService(this.nsIWindowWatcher);

			var argstring = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(this.nsISupportsString);
			argstring.data = rmFx_startupID + "|.|" + msgString;

			dump ("ReminderFox  clh(2)  {argstring.data: " + argstring.data + "}\n");

			wwatch.openWindow(
						null,
						"chrome://reminderfox/content/mail/rmFxStartup4msgID.xul",
						"msgID", "chrome,centerscreen", argstring);
		},


		/* nsIFactory */
		createInstance : function (outer, iid) {
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			return this.QueryInterface(iid);
		},


		lockFactory : function (lock) {
			/* no-op */
		}
	};


/*
 * The NSGetModule function is the magic entry point that XPCOM uses to find
 * what XPCOM objects this component provides
 *
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4, SeaMonkey 2.1).
 * XPCOMUtils.generateNSGetModule was introduced in Mozilla 1.9 (Firefox 3.0).
 */
if ("undefined" == typeof XPCOMUtils) {
	function NSGetModule(aComMgr, aFileSpec) {
		return reminderFoxHandler;
	}
} else if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([reminderFoxHandler]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([reminderFoxHandler]);
