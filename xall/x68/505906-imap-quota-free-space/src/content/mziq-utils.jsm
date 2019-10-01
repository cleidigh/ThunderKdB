"use strict";

let EXPORTED_SYMBOLS = ["miczImapQuotaUtils"];

var miczImapQuotaUtils = {

  _bundleIQ:null,

	formatBytes: function(bytes,decimals) {
		   if(bytes == 0){
			   return '0 Bytes';
		   }
		   let k = 1024;
		   let dm = decimals || 2;
		   let sizes = ['bytes', 'kB', 'MB', 'GB'];
		   let i = Math.floor(Math.log(bytes) / Math.log(k));
		   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + miczImapQuotaUtils._bundleIQ.GetStringFromName("ImapQuota."+sizes[i]);
	},
	
	formatKB: function(bytes,decimals) {
      return this.formatBytes(bytes*1024,decimals);
	},
	
	setStringBundle:function(){
     let strBundleIQ= Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
     miczImapQuotaUtils._bundleIQ = strBundleIQ.createBundle("chrome://imapquota/locale/overlay.properties");
	},

};
