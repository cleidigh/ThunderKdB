Cu.importGlobalProperties(["URL"]);

runLater(checkForHotmail, logError, 3000); // 3 seconds, arbitrary value

/**
 * Prompts the user to migrate their Hotmail accounts from Owl to IMAP.
 */
async function checkForHotmail() {
  if (Services.prefs.getBoolPref("extensions.owl.doNotMigrateHotmail", false)) {
    return; // user opted in
  }
  let accounts = getHotmailAccounts();
  let verifiedAccounts = [];
  for (let account of accounts) {
    try {
      await verifyIMAPLogin(account);
      verifiedAccounts.push(account);
    } catch (e) {
      logError("Hotmail account does not work with IMAP");
      logError(e);
    }
  }
  accounts = verifiedAccounts;
  if (!accounts.length) {
    return;
  }
  let domain = "Hotmail";
  try {
    domain = accounts[0].incomingServer.username.split("@")[1];
  } catch (e) {
    logError(e);
  }
  let doNotMigrateHotmail = { value: false };
  let strings = {};
  for (let string of ["title", "message", "migrate", "keep"]) {
    strings[string] = await CallExtension(accounts[0].incomingServer, "GetString", { bundleName: "owl", id: "migration." + string });
    strings[string] = strings[string].replace("%domain%", domain);
  }
  let flags = Ci.nsIPrompt.BUTTON_POS_0 * Ci.nsIPrompt.BUTTON_TITLE_IS_STRING +
              Ci.nsIPrompt.BUTTON_POS_1 * Ci.nsIPrompt.BUTTON_TITLE_IS_STRING;
  let button = Services.prompt.confirmEx(
      MailServices.mailSession.topmostMsgWindow.domWindow,
      strings.title,
      strings.message,
      flags,
      strings.migrate,
      strings.keep,
      null,
      null,
      doNotMigrateHotmail);
  if (button == 0) {
    await migrateHotmailAccounts(accounts);
  }
  Services.prefs.setBoolPref("extensions.owl.doNotMigrateHotmail", true);
}

/**
 * Returns an array of Hotmail accounts, if all Owl accounts are Hotmail accounts.
 *
 * @returns {Array[nsIMsgAccount]} The server ids of the Hotmail accounts
 */
function getHotmailAccounts() {
  let hotmail = [];
  for (let account of /* COMPAT for TB 68 (bug 1614846) */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
    switch (account.incomingServer.type) {
    case "owl-ews":
      return []; // TODO but probably not Hotmail
    case "owl":
      let owaURL = account.incomingServer.getUnicharValue("owa_url");
      if (new URL(owaURL).hostname != "outlook.live.com") {
        return []; // non-hotmail servers; don't migrate anything
      }
      if (hasIMAPHotmailAccount(account.incomingServer.realUsername)) {
        continue;
      }
      hotmail.push(account);
    }
  }
  return hotmail;
}

/**
 * Checks whether there's an IMAP or POP3 account for this Hotmail user.
 *
 * @param aUsername {String} The Hotmail address
 * @returns {Boolean}
 */
function hasIMAPHotmailAccount(aUsername) {
  for (let account of /* COMPAT for TB 68 (bug 1614846) */toArray(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
    let incomingServer = account.incomingServer;
    if (incomingServer.type != "imap" && incomingServer.type != "pop3") {
      continue;
    }
    if (incomingServer.realHostname == "outlook.office365.com" &&
        incomingServer.realUsername == aUsername) {
      return true;
    }
  }
  return false;
}

async function migrateHotmailAccounts(aOwlAccounts) {
  for (let owlAccount of aOwlAccounts) {
    try {
      createIMAPAccount(owlAccount);
      MailServices.accounts.removeAccount(owlAccount, true);
    } catch (ex) {
      logError(ex);
      Services.prompt.alert(MailServices.mailSession.topmostMsgWindow.domWindow, "Migration error", ex.message);
    }
  }
}

/**
 * Ensures that Hotmail can be logged in via IMAP.
 *
 * @param aOwlAccount {nsIMsgAccount} The Owl account
 * @returns {Promise}
 */
function verifyIMAPLogin(aOwlAccount) {
  return new Promise((resolve, reject) => {
    let server = null;
    try {
      server = MailServices.accounts.createIncomingServer(aOwlAccount.incomingServer.realUsername, "outlook.office365.com", "imap");
      server.port = 993;
      server.socketType = Ci.nsMsgSocketType.SSL;
      server.valid = true;
      let bundle = Services.strings.createBundle("chrome://messenger/locale/imapMsgs.properties");
      let passwordPrompt = bundle.formatStringFromName("imapEnterServerPasswordPrompt", [server.realUsername, server.realHostName], 2); // COMPAT for TB 68 (bug 1557793)
      let passwordTitle = bundle.GetStringFromName("imapEnterPasswordPromptTitle");
      server.password = aOwlAccount.incomingServer.getPasswordWithUI(passwordPrompt, passwordTitle, MailServices.mailSession.topmostMsgWindow);
        server.verifyLogon({
        OnStartRunningUrl(aURI) {
        },
        OnStopRunningUrl(aURI, aResult) {
          MailServices.accounts.removeIncomingServer(server, true);
          if (Components.isSuccessCode(aResult)) {
            resolve();
          }
          reject(Components.Exception(aResult));
        },
      }, MailServices.mailSession.topmostMsgWindow);
    } catch (ex) {
      if (server) {
        MailServices.accounts.removeIncomingServer(server, true);
      }
      reject(ex);
    }
  });
}

/**
 * Creates an IMAP account for an Owl Hotmail account.
 *
 * @param aOwlAccount {nsIMsgAccount} The Owl account.
 */
function createIMAPAccount(aOwlAccount) {
  let username = aOwlAccount.incomingServer.realUsername;
  let password = aOwlAccount.incomingServer.password;
  let server = null;
  let account = null;
  try {
    server = MailServices.accounts.createIncomingServer(username, "outlook.office365.com", "imap");
    server.port = 993;
    server.socketType = Ci.nsMsgSocketType.SSL;
    server.password = password;
    server.prettyName = aOwlAccount.incomingServer.prettyName;
    server.valid = true;
    account = MailServices.accounts.createAccount();
    let identities = /* COMPAT for TB 68 (bug 1612239) */toArray(aOwlAccount.identities, Ci.nsIMsgIdentity);
    for (let identity of identities) {
      account.addIdentity(identity);
    }
    account.incomingServer = server;
    savePassword("imap://outlook.office365.com", username, password);
    server.performBiff(MailServices.mailSession.topmostMsgWindow);
    let smtpServer = MailServices.smtp.createServer();
    smtpServer.hostname = "outlook.office365.com";
    smtpServer.port = 587;
    smtpServer.socketType = Ci.nsMsgSocketType.alwaysSTARTTLS;
    smtpServer.username = username;
    smtpServer.password = password;
    if (!MailServices.smtp.defaultServer) {
      MailServices.smtp.defaultServer = smtpServer;
    }
    for (let identity of identities) {
      identity.smtpServerKey = smtpServer.key;
    }
    savePassword("smtp://outlook.office365.com", username, password);
  } catch (ex) {
    if (account) {
      MailServices.accounts.removeAccount(account, true);
    } else {
      if (server) {
        MailServices.accounts.removeIncomingServer(server, true);
      }
    }
    throw ex;
  }
}

function savePassword(serverURL, username, password) {
  try {
    let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
    login.init(serverURL, null, serverURL, username, password, /* COMPAT for TB 68 */ "", "");
    Services.logins.addLogin(login);
  } catch (ex) {
    logError(ex);
  }
}
