
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var exp_logout = class extends ExtensionCommon.ExtensionAPI {
	getAPI(context) {
		return {
			exp_logout: {
				async exp_logout(identities) {
					if( identities != null && identities.length > 0 ) {
						var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
						if( acctMgr != null ) {
							var accounts = acctMgr.accounts;
							if( accounts != null && accounts.length > 0 ) {
								for (var i = 0; i < accounts.length; i++) {  
									var account = accounts[i];
									if( account != null && account.identities != null && account.incomingServer != null ) {
										for (var j = 0; j < account.identities.length; j++) {
											var id = account.identities[j];
											if( id != null ) {
												for (var k = 0; k < identities.length; k++) {
													var id2logout = identities[k].id;
													if( id2logout == id.key ) {						
														account.incomingServer.forgetPassword();
														account.incomingServer.forgetSessionPassword();
														account.incomingServer.closeCachedConnections();
														var smtpService=Components.classes['@mozilla.org/messengercompose/smtp;1'].getService(Components.interfaces.nsISmtpService);
														if( smtpService != null ) {
															var smtpServer=smtpService.getServerByKey(id.smtpServerKey);
															if( smtpServer != null ) {
																smtpServer.forgetPassword();
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
};

