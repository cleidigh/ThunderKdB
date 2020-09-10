var { Services} = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);

var GetSendButton_functions = {

  /**
   * Get messages for the account selected from Menu dropdowns.
   * if offline, prompt for getting messages.
   *
   * @param aFolder (optional) a folder in the account for which messages should
   *								be retrieved. If null, all accounts will be used.
   */
  GetSingleAccountOrGetAndSend: function(aFolder, event) {
    if (!aFolder) {
    // console.log("GetSendButton: GetSingleAccountOrGetAndSend: call decide function");
    this.DecideGetAndSendMessages(event);
      return;
    }

    if (MailOfflineMgr.isOnline() || MailOfflineMgr.getNewMail()) {
      let server = aFolder.server;
      // console.log("GetSendButton: GetSingleAccountOrGetAndSend: explicitly get for server: " + server);
      GetMessagesForInboxOnServer(server);
    }
  },

  // ----- Funktion des Buttons Get/Send -----
  DecideGetAndSendMessages: function(event) {
    // console.log("GetSendButton: DecideGetAndSendMessages");

    let prefGetSendButtonSend =
      Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_SendYes", true);
    let prefGetSendButtonOnlySingleAccount =
      Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_OnlySingleAccount", true);
    let prefGetSendButtonPass =
      Services.prefs.getBoolPref(
        "extensions.getsendbutton.GetSendButton_AskPasswords", true);

    if (prefGetSendButtonSend) { // Send=Yes
      if (!prefGetSendButtonPass) { // Ask not for passwords
        if ((event.shiftKey == true) || (!prefGetSendButtonOnlySingleAccount)) {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getMsgsForAuthAccounts");
          goDoCommand('cmd_getMsgsForAuthAccounts');
        } else {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getNewMessages");
          goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
        }
        if (!(event.ctrlKey || event.metaKey)) { // STRG (or Cmd on OS X) disables sending
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_sendUnsentMsgs");
          goDoCommand('cmd_sendUnsentMsgs');
        }
      } else if (prefGetSendButtonPass) { // Ask for passwords			
        if ((event.shiftKey == true) || (!prefGetSendButtonOnlySingleAccount)) {
          // console.log("GetSendButton: DecideGetAndSendMessages: GetMessagesForAllAccounts");
          this.GetMessagesForAllAccounts();
        } else {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getNewMessages");
          goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
        }
        if (!(event.ctrlKey || event.metaKey)) { // STRG (or Cmd on OS X) disables sending
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_sendUnsentMsgs");
          goDoCommand('cmd_sendUnsentMsgs');
        }
      }
    } else { // Send=No
      if (!prefGetSendButtonPass) { // Ask not for passwords
        if ((event.shiftKey == true) || (!prefGetSendButtonOnlySingleAccount)) {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getMsgsForAuthAccounts");
          goDoCommand('cmd_getMsgsForAuthAccounts');
        } else {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getNewMessages");
          goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
        }
      } else if (prefGetSendButtonPass) { // Ask for passwords			
        if ((event.shiftKey == true) || (!prefGetSendButtonOnlySingleAccount)) {
          // console.log("GetSendButton: DecideGetAndSendMessages: GetMessagesForAllAccounts");
          this.GetMessagesForAllAccounts();
        } else {
          // console.log("GetSendButton: DecideGetAndSendMessages: cmd_getNewMessages");
          goDoCommand('cmd_getNewMessages'); // nur aktuelles Konto abrufen
        }
      }
    }
  },

  // adapted function out from mailWindowOverlay.js
  // original function GetMessagesForAllAuthenticatedAccounts()
  GetMessagesForAllAccounts: function() {

    // console.log("GetSendButton: GetMessagesForAllAccounts");

    if (MailOfflineMgr.isOnline() || this.PromptGoOnline()) {

      // console.log("GetSendButton: GetMessagesForAllAccounts: we are online");

      try {
        // Array of arrays of servers for a particular folder.
        var pop3DownloadServersArray = [];
        // parallel array of folders to download to...
        var localFoldersToDownloadTo = [];
        var pop3Server;
    
        for (let server of accountManager.allServers) {
          // comment out the part:
          // "&& !server.passwordPromptRequired)"
          // // if (server.protocolInfo.canGetMessages &&
          // // !server.passwordPromptRequired)
          if (server.protocolInfo.canGetMessages) {
            // console.log("GetSendButton: GetMessagesForAllAccounts: can get messages");
            if (server.type == "pop3") {
              // console.log("GetSendButton: GetMessagesForAllAccounts: POP3 account");
              CoalesceGetMsgsForPop3ServersByDestFolder(
                server,
                pop3DownloadServersArray,
                localFoldersToDownloadTo
              );
              pop3Server = server.QueryInterface(Ci.nsIPop3IncomingServer);
            } else {
              // get new messages on the server for imap or rss
              // console.log("GetSendButton: GetMessagesForAllAccounts: Other account (not POP3)");
              GetMessagesForInboxOnServer(server);
            }
          }
        }

        for (let i = 0; i < pop3DownloadServersArray.length; ++i) {
          // console.log("GetSendButton: GetMessagesForAllAccounts: in pop3array - download now");
          // any ol' pop3Server will do - the serversArray specifies which servers to download from
          pop3Server.downloadMailFromServers(
            pop3DownloadServersArray[i],
            msgWindow,
            localFoldersToDownloadTo[i],
            null
          );
        }
      } catch (ex) {
        // console.log("GetSendButton: GetMessagesForAllAccounts: catch (ex): " + ex);
      }
    }
  },

  PromptGoOnline: function() {
    // console.log("GetSendButton: PromptGoOnline");

    const nsIPS = Components.interfaces.nsIPromptService;
    let promptService =
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(nsIPS);
    let alwaysAsk = {
      value: true
    };

    let goOnline = promptService.confirmEx(window,
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