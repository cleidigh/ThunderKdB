var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var GetSendButton_functions = {

	/**
	 * Get messages for the account selected from Menu dropdowns.
	 * if offline, prompt for getting messages.
	 *
	 * @param aFolder (optional) a folder in the account for which messages should
	 *								be retrieved. If null, all accounts will be used.
	 */
	GetSingleAccountOrGetAndSend: function(aFolder,event)
	{
		if (!aFolder) {
			this.DecideGetAndSendMessages(event);
			return;
		}

		if (MailOfflineMgr.isOnline() || MailOfflineMgr.getNewMail()) {
			let server = aFolder.server;
			GetMessagesForInboxOnServer(server);
		}
	},

	// ----- Funktion des Buttons Get/Send -----
	DecideGetAndSendMessages: function(event)
	{
		let prefGetSendButtonSend = Services.prefs.getBoolPref("extensions.getsendbutton.GetSendButton_SendYes", true);
		let prefGetSendButtonOnlySingleAccount = Services.prefs.getBoolPref("extensions.getsendbutton.GetSendButton_OnlySingleAccount", true);
		let prefGetSendButtonPass = Services.prefs.getBoolPref("extensions.getsendbutton.GetSendButton_AskPasswords", true);

		if (prefGetSendButtonSend) {	                     // Send=Yes
			if (!prefGetSendButtonPass) {		          // Ask not for passwords
				if ((event.shiftKey==true) || (!prefGetSendButtonOnlySingleAccount)) {
					goDoCommand('cmd_getMsgsForAuthAccounts');
				}
				else {
					goDoCommand('cmd_getNewMessages');       // nur aktuelles Konto abrufen
				}
				if (!(event.ctrlKey || event.metaKey)) {    // STRG (or Cmd on OS X) disables sending
					goDoCommand('cmd_sendUnsentMsgs');
				}
			}
			else if (prefGetSendButtonPass)	{               // Ask for passwords			
				if ((event.shiftKey==true) || (!prefGetSendButtonOnlySingleAccount)) {
					this.GetMessagesForAllAccounts();
				}
				else {
					goDoCommand('cmd_getNewMessages');         // nur aktuelles Konto abrufen
				}
				if (!(event.ctrlKey || event.metaKey)) {     // STRG (or Cmd on OS X) disables sending
					goDoCommand('cmd_sendUnsentMsgs');
				}
			}
		}
		else {		// Send=No
			if (!prefGetSendButtonPass)	{		       // Ask not for passwords
				if ((event.shiftKey==true) || (!prefGetSendButtonOnlySingleAccount)) {
					goDoCommand('cmd_getMsgsForAuthAccounts');
				}
				else {
					goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
				}
			}
			else if (prefGetSendButtonPass)	{          // Ask for passwords			
				if ((event.shiftKey==true) || (!prefGetSendButtonOnlySingleAccount)) {
					this.GetMessagesForAllAccounts();
				}
				else {
					goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
				}
			}
		}
	},

	GetMessagesForAllAccounts: function()
	{
		// console.log("GetSendButton: alle Konten");
		if (MailOfflineMgr.isOnline() || this.PromptGoOnline()) {
			// console.log("GetSendButton: wir sind online");
			try {
				var allServers = accountManager.allServers;
				// Array of arrays of servers for a particular folder.
				var pop3DownloadServersArray = [];
				// Parallel array of folders to download to...
				var localFoldersToDownloadTo = [];
				var pop3Server;

				for (let i = 0; i < allServers.length; ++i) {
					var currentServer = allServers.queryElementAt(i, Ci.nsIMsgIncomingServer);
					if (currentServer.protocolInfo.canGetMessages) {
						// console.log("GetSendButton: koennen Mails abholen");
		
						if (currentServer.type == "pop3") {  // && currentServer.downloadOnBiff)
						                                     // force mail download 
							                                 // (ignore account pref download new mail automatically (downloadOnBiff))
							// console.log("GetSendButton: POP3-Konto");
							CoalesceGetMsgsForPop3ServersByDestFolder(currentServer,
							                                          pop3DownloadServersArray, localFoldersToDownloadTo);
							pop3Server = currentServer.QueryInterface(Ci.nsIPop3IncomingServer);
						} else {
							// console.log("GetSendButton: sonstiges Konto");
							// Check to see if there are new messages on the server
							currentServer.performBiff(msgWindow);
						}
					}
				}
				for (let i = 0; i < pop3DownloadServersArray.length; ++i) {
						// console.log("GetSendButton: im pop3array - frage jetzt ab");

						// Any ol' pop3Server will do - the serversArray specifies which servers
						// to download from.
						pop3Server.downloadMailFromServers(pop3DownloadServersArray[i],
						                                   pop3DownloadServersArray[i].length,
						                                   msgWindow,
						                                   localFoldersToDownloadTo[i],
						                                   null);
				}
			} catch (ex) {
				// console.log(ex + "\n");
			}
		}
	},

	PromptGoOnline: function()
	{
		// console.log("GetSendButton: PromptGoOnline");

		const nsIPS = Components.interfaces.nsIPromptService;
		let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(nsIPS);
		let alwaysAsk = {value: true};

		let goOnline =	promptService.confirmEx(window,
		                                        MailOfflineMgr.offlineBundle.getString('getMessagesOfflineWindowTitle1'),
		                                        MailOfflineMgr.offlineBundle.getString('getMessagesOfflineLabel1'),
		                                        nsIPS.STD_YES_NO_BUTTONS,
		                                        null, null, null,
		                                        null, alwaysAsk) == 0 ? true : false;

		if (goOnline)
			MailOfflineMgr.offlineManager.goOnline(false, false, msgWindow);
		return goOnline;
	}
}
