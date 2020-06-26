var QN_globalvar={
	qnprefs: Components.classes["@mozilla.org/preferences-service;1"]
					 .getService(Components.interfaces.nsIPrefService)
					 .getBranch("extensions.quicknote."),
	getIntPref: function(key){
		try{
			return this.qnprefs.getIntPref(key);
		}catch(e){
			return 0;
		}
	},
	getBoolPref: function(key){
		try{
			var tmpVal = this.qnprefs.getBoolPref(key);
			if(tmpVal || tmpVal === "true"){
				return true;
			}else{
				return false;
			}
		}catch(e){
			return false;
		}
	},
};
