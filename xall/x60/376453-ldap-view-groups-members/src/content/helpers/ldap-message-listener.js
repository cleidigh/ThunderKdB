function pLDAPMessageListener (connection, callback) {
	this.connection = connection;
	this.callback = callback;
	
	this.QueryInterface = function(iid) {	
		if (iid.equals(Components.interfaces.nsISupports) 
				|| iid.equals(Components.interfaces.nsILDAPMessageListener))
			return this;
		else
			Components.returnCode = Components.results.NS_ERROR_NO_INTERFACE;
		return null;
	};	
	
	this.onLDAPInit = function(pConn, pStatus) {
		//Components.utils.reportError('+++ BEGIN onLDAPInit +++');
		if(!this.connection.isConnected) {
			this.connection.bind(this.callback);
		}
		this.connection.isConnected = true;
		//Components.utils.reportError('+++ END onLDAPInit +++');
	};
	
	this.onLDAPMessage = function(pMsg) {
		//Components.utils.reportError('+++ BEGIN onLDAPMessage +++');
		switch (pMsg.type) {
			case Components.interfaces.nsILDAPMessage.RES_BIND :
				//Components.utils.reportError('++++++ Bind Result +++');
				var r = pMsg.errorCode == Components.interfaces.nsILDAPErrors.SUCCESS;
				//this.callback.onBindResult(r, pMsg.errorCode);
				this.connection.bindFailed = !r;
				this.connection.bindInProgress = false;
				break;
			case Components.interfaces.nsILDAPMessage.RES_SEARCH_ENTRY :
				//Components.utils.reportError('++++++ Res Search Entry +++');
				var count = {};
				var attributes = {};
				var rAttr = [];
				try {
						attributes = pMsg.getAttributes(count, attributes);
						for(i in attributes) {
							var valCount = {};
							var vals = [];
							vals = pMsg.getValues(attributes[i], valCount, vals);
							rAttr.push({'attribute':attributes[i], 'values':vals});
						}
				} catch(e) {
					Components.utils.reportError("Could not get requested attributes, no attribute returned or the server has restricted access ?"+e);
				}
				var resultEntry = { 'dn': pMsg.dn, 'attributes': rAttr };
				try {this.callback.onSearchResultEntry(resultEntry);}catch(e){Components.utils.reportError(e);}
				break;
			case Components.interfaces.nsILDAPMessage.RES_SEARCH_RESULT :
				//Components.utils.reportError('++++++ Res Search Result +++');
				try {this.callback.onSearchResult(pMsg.errorCode);}catch(e){Components.utils.reportError(e);}
				break;
		}
		//Components.utils.reportError('+++ END onLDAPMessage +++');
	};
	try {
	  return getProxyForMainThread(this, Components.interfaces.nsILDAPMessageListener);
	} catch(e){
	  return this;
	}
}