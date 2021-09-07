/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Alec Flett <alecf@netscape.com>
 *   Kent James <rkent@mesquilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

 // This file was modified to force ews account type

var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("account");
  return _log;
});

if (typeof(exquilla) == "undefined")
  var exquilla = {};

exquilla.AW = (function exquillaAW()
{
  function _e(elementID) { return document.getElementById(elementID);}

  const exquillaStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                            .getService(Ci.nsIStringBundleService)
                            .createBundle("chrome://exquilla/locale/exquilla.properties");

  function setAccountTypeData()
  {
    var pageData = GetPageData();
    setPageData(pageData, "accounttype", "mailaccount",false);
    setPageData(pageData, "accounttype", "newsaccount", false);

    // Other account type, e.g. Movemail
    setPageData(pageData, "accounttype", "otheraccount", true);
  }

  function alertAutodiscover(aFoundAutodiscover, aServerErrorMsg)
  {
    let alertText = aFoundAutodiscover ? exquillaStrings.GetStringFromName("adFound")
                                       : exquillaStrings.GetStringFromName("adNotFound");
    title = exquillaStrings.GetStringFromName("adFailed");
    let promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Ci.nsIPromptService);
    promptService.alert(window, title, (aServerErrorMsg ? aServerErrorMsg + "\n\n" : "") + alertText);
  }

  function doNothing()
  {
  }

  function ewsOnAccountWizardLoad()
  { try {
    // The account manager tries to install most of the event listeners.
    // Override them with our functionality before it loads.
    window.acctTypePageUnload = doNothing;
    window.identityPageInit = ewsIdentityPageValidate;
    window.identityPageUnload = ewsIdentityPageUnload;
    window.incomingPageInit = doNothing;
    window.incomingPageUnload = doNothing;
    window.outgoingPageInit = doNothing;
    window.outgoingPageUnload = doNothing;
    window.acctNamePageInit = doNothing;
    window.acctNamePageUnload = doNothing;
    window.donePageInit = ewsDonePageInit;
    // Add our own custom event listeners.
    _e("exquillaServerPage").addEventListener("pageshow", serverPageInit);
    _e("exquillaServerPage").addEventListener("pageadvanced", serverPageUnload);
    onAccountWizardLoad();
    overrideAccountWizard();
    setAccountTypeData();
    let pageData = GetPageData();
    gCurrentAccountData = ewsData;
    AccountDataToPageData(ewsData, pageData);
    try {
      _e("fullName").value = Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo).fullname;
    } catch (ex) {
      // It's OK if the user info does not exist or fails.
      // We normally get the full name from XML anyway.
      // If that fails, we'll just wait for the user to enter it.
    }
    return true;
  } catch (e) {log.warn(re(e));}}

  function ewsOnAccountWizardUnload() {
    let mail3Pane = Services.wm.getMostRecentWindow("mail:3pane");
    if (!mail3Pane) {
      return;
    }
    // Nothing to update since folder pane is already visible or no account has been created.
    if (mail3Pane.gFolderDisplay.folderPaneVisible || MailServices.accounts.accounts.length == 0) {
      return;
    }

    mail3Pane.MsgToggleFolderPane();
    mail3Pane.gFolderDisplay.folderPaneVisible = true;
  }

  var ewsData =
  {
    'incomingServer':
    {
      'type': 'exquilla',
      'ServerType-exquilla':
      {
        // (This is not an IDL attribute) 'logEws': false,
        'useAB': true,
        'useCalendar': false,
        'useMail': true,
      },
      'loginAtStartUp': true,
      'port': 443,
      'socketType': 3,
      'biffMinutes': 5,
      'doBiff': true,
      'protocolInfo': { 'serverIID': null },
    },
    'identity':
    {
      'FccFolder': 'Sent'
    },
    'emailProviderName': 'EWS',
  }

  function emailNameAndDomainAreLegal(aString)
  {
    return /^[!-?A-~]+\@[A-Za-z0-9.-]+$/.test(aString);
  }

  function serverPageValidate()
  { try {
    if (_e("exquillaManualURL").getAttribute("status") != "success")
      ewsTestUrl([_e('exquillaserverurl').value], Ci.nsMsgAuthMethod.anything);
  } catch(e) {log.warn(e);}}

  function ewsIdentityPageValidate()
  { try{
    var canAdvance = false;
    var email = _e("email").value.trim();
    var username = "";
    var domain = "";
    if (email) {
      //let matches = email.match(/^([^@]*)@?([^\.]*)/);
      let matches = email.match(/^([^@]*)@?(.*)/);
      username = matches[1] ? matches[1] : "";
      let hostname = matches[2] ? matches[2] : "";
      domain = hostname.match(/^[^\.]*/);
      canAdvance = emailNameAndDomainAreLegal(email);

      if (canAdvance) {
        var pageData = parent.GetPageData();
        var serverType = parent.getCurrentServerType(pageData);
        if (parent.AccountExists(email, hostname, serverType))
          canAdvance = false;
      }
    }

    // If the user is setting the username separately, then use THAT for the
    //  domain. We allow "domain\username" or "username@domain(.com)"
    let exUserName = _e("exquillaUserName");
    if (exUserName.value.length)
    {
      // try to match an email address
      let form1 = exUserName.value.match(/^([^@]*)@?([^\.]*)/);
      if (form1[2] && form1[2].length)
        domain = form1[2];
      else // try to match domain\username
      {
        let form2 = exUserName.value.match(/^([^\\]*)\\?(.*)/);
        if (form2[2] && form2[2].length && form2[1] && form2[1].length) // look for username after backslash
          domain = form2[1];
        else
          domain = "";
      }
    }

    exUserName.placeholder = username;
    let domainElement = _e("exquillaDomain");
    domainElement.placeholder = domain;
    // If the domain can be inferred from the format of the username, then
    //  do not allow it to be set separately
    if (domain.length)
    {
      domainElement.disabled = true;
      domainElement.value = '';
    }
    else
    {
      let useEmail = _e("exquillaUseEmailCredentials").selected;
      if (!useEmail)
        domainElement.disabled = false;
    }
    // this seems to generate error messages with no perceived value
    try { document.querySelector("wizard").canAdvance = canAdvance; }
    catch (e) {}
  } catch (e) {log.warn(re(e));}}

  function ewsOnUseAutodiscovery()
  {
    let useAd = _e('exquillaUseAutodiscovery').selected;
    if (useAd)
    {
      _e('exquillaserverurl').disabled = true;
      _e('exquillaDoAutodiscovery').disabled = false;
    }
    else
    {
      _e('exquillaserverurl').disabled = false;
      _e('exquillaDoAutodiscovery').disabled = true;
    }
  }

  var gPrefsBundle;
  function ewsDonePageInit() { try {
    var pageData = parent.GetPageData();
    var currentAccountData = gCurrentAccountData;
    gPrefsBundle = _e("bundle_prefs");

    var email = "";
    if (pageData.identity && pageData.identity.email) {
      email = pageData.identity.email.value;
    }
    setDivTextFromForm("identity.email", email);

    var userName="";
    if (pageData.login && pageData.login.username && pageData.login.username.value.length)
      userName = pageData.login.username.value;
    else
      userName = email;
    setDivTextFromForm("login.username", userName);

    var domain="";
    if (pageData.login && pageData.login.domain && pageData.login.domain.value.length)
      domain = pageData.login.domain.value;
    setDivTextFromForm("login.domain", domain);

    var fullName = "";
    if (pageData.identity && pageData.identity.fullName)
      fullName = pageData.identity.fullName.value;
    setDivTextFromForm("identity.fullName", fullName);

    let ewsURL = pageData.server && pageData.server.ewsURL ?
                 pageData.server.ewsURL.value : "";

    setDivTextFromForm("server.ewsURL", ewsURL);

  } catch (e) {log.warn(re(e));}}

  function ewsIdentityPageUnload()
  {
    var pageData = parent.GetPageData();
    var name = _e("exquillaUserName").value.trim();
    var domain = _e("exquillaDomain").value.trim();
    var password = _e("exquillaPassword").value;
    var savePassword = _e("exquillaSavePassword").checked;
    var email = _e("email").value.trim();

    // only set the domain if it is we are not using an email address as username
    if (name.length && !domain.length)
    {
      let form2 = name.match(/^([^\\]*)\\?(.*)/);
      if (form2[2] && form2[2].length && form2[1] && form2[1].length) // look for username after backslash
      {
        domain = form2[1];
        name = form2[2];
      }
    }

    setPageData(pageData, "identity", "email", email);
    setPageData(pageData, "login", "username", name);
    setPageData(pageData, "login", "domain", domain);
    setPageData(pageData, "login", "password", password);
    setPageData(pageData, "login", "savePassword", savePassword);
    log.config("identity page: email=" + email + " username=" + name + " domain=" + domain);
    log.debug("identity password set? "+ (password.length ? "true" : "false") + " savePassword? " + savePassword);

    return true;
  }

  function overrideAccountWizard()
  { try {

    // This method overrides the AccountWizard.js function
    // finishAccount to use safeGetJS instead of QueryInterface.

    // given an accountData structure, copy the data into the
    // given account, incoming server, and so forth
    finishAccount = function exquillaFinishAccount(account, accountData) 
    {
      if (accountData.incomingServer) {

        var destServer = account.incomingServer;
        var srcServer = accountData.incomingServer;
        copyObjectToInterface(destServer, srcServer, true);

        // see if there are any protocol-specific attributes
        // if so, we use the type to get the IID, QueryInterface
        // as appropriate, then copy the data over
        dump("srcServer.ServerType-" + srcServer.type + " = " +
              srcServer["ServerType-" + srcServer.type]);
        if (srcServer["ServerType-" + srcServer.type]) {
          // handle server-specific stuff
          var IID;
          try {
            IID = destServer.protocolInfo.serverIID;
          } catch (ex) {
            Components.utils.reportError("Could not get IID for " + srcServer.type + ": " + ex);
          }

          if (IID) {
            // *** modified section.
            let destProtocolServer = safeGetJS(destServer, "EwsIncomingServer");
            // *** end modified section.
            let srcProtocolServer = srcServer["ServerType-" + srcServer.type];

            dump("Copying over " + srcServer.type + "-specific data\n");
            copyObjectToInterface(destProtocolServer, srcProtocolServer, false);
          }
        }
          
        account.incomingServer.valid=true;
        // hack to cause an account loaded notification now the server is valid
        account.incomingServer = account.incomingServer;
      }

      // copy identity info
      var destIdentity = account.identities.length ?
                         /* COMPAT for TB 68 */toArray(account.identities, Ci.nsIMsgIdentity)[0] :
                         null;

      if (destIdentity) // does this account have an identity?
      {   
          if (accountData.identity && accountData.identity.email) {
              // fixup the email address if we have a default domain
              var emailArray = accountData.identity.email.split('@');
              if (emailArray.length < 2 && accountData.domain) {
                  accountData.identity.email += '@' + accountData.domain;
              }

              copyObjectToInterface(destIdentity, accountData.identity, true);
              destIdentity.valid=true;
          }

          /**
           * If signature file need to be set, get the path to the signature file.
           * Signature files, if exist, are placed under default location. Get
           * default files location for messenger using directory service. Signature 
           * file name should be extracted from the account data to build the complete
           * path for signature file. Once the path is built, set the identity's signature pref.
           */
          if (destIdentity.attachSignature)
          {
              var sigFileName = accountData.signatureFileName;
              let sigFile = MailServices.mailSession.getDataFilesDir("messenger");
              sigFile.append(sigFileName);
              destIdentity.signature = sigFile;
          }

          if (accountData.smtp.hostname && !destIdentity.smtpServerKey)
          {
              // hostname + no key => create a new SMTP server.

              let smtpServer = MailServices.smtp.createServer();
              var isDefaultSmtpServer;
              if (!MailServices.smtp.defaultServer.hostname) {
                MailServices.smtp.defaultServer = smtpServer;
                isDefaultSmtpServer = true;
              }

              copyObjectToInterface(smtpServer, accountData.smtp, false);

              // If it's the default server we created, make the identity use
              // "Use Default" by default.
              destIdentity.smtpServerKey =
                (isDefaultSmtpServer) ? "" : smtpServer.key;
           }
       } // if the account has an identity...

    }

    // override global AccountDataToPageData to correct account type
    let oldAccountDataToPageData = AccountDataToPageData;
    AccountDataToPageData = function ewsAccountDataToPageData(ispData, pageData)
    {
      oldAccountDataToPageData(ispData, pageData);
      if (ispData.incomingServer.type == 'exquilla')
        pageData.accounttype.mailaccount.value = false;
    }

    // override PageDataToAccountData to copy ews-specific information
    let oldPageDataToAccountData = PageDataToAccountData;
    PageDataToAccountData = function ewsPageDataToAccountData(pageData, accountData)
    { try {
      oldPageDataToAccountData(pageData, accountData);
      if (accountData.incomingServer.type == 'exquilla')
      {
        if (!accountData.incomingServer["ServerType-exquilla"])
          accountData.incomingServer["ServerType-exquilla"] = {};

        // add the ewsURL to the server
        if (pageData.server.ewsURL)
          accountData.incomingServer["ServerType-exquilla"].ewsURL = pageData.server.ewsURL.value;

        // add domain if defined
        if (pageData.login && pageData.login.domain)
          accountData.incomingServer["ServerType-exquilla"].domain = pageData.login.domain.value;

        // set the appropriate user name
        if (pageData.login.username && pageData.login.username.value.length)
          accountData.incomingServer.username = pageData.login.username.value;
        else
          accountData.incomingServer.username = pageData.identity.email.value;

        if (pageData.server.useMail)
          accountData.incomingServer["ServerType-exquilla"].useMail = pageData.server.useMail.value;
        if (pageData.server.useAB)
          accountData.incomingServer["ServerType-exquilla"].useAB = pageData.server.useAB.value;
        if (pageData.server.useCalendar)
          accountData.incomingServer["ServerType-exquilla"].useCalendar = pageData.server.useCalendar.value;
      }
    } catch(e) {log.warn(re(e));}}

    // override setDefaultCopiesAndFoldersPrefs to prevent creation of DBs for unused folders
    let oldSetDefaultCopiesAndFoldersPrefs = setDefaultCopiesAndFoldersPrefs;
    setDefaultCopiesAndFoldersPrefs = function exquillaSetDefaultCopiesAndFoldersPrefs(identity, server, accountData)
    {
      if (server.type == 'exquilla')
      {
        return ewsSetDefaultCopiesAndFoldersPrefs(identity, server, accountData);
      }
      else
      {
        return oldSetDefaultCopiesAndFoldersPrefs(identity, server, accountData);
      }
    }

  } catch (e) {log.warn(re(e));}}

  function serverPageInit()
  { try {
    gPrefsBundle = _e("bundle_prefs");
    if (Services.prefs.getBoolPref("extensions.exquilla.disableCalendar"))
    {
      _e("exquillaUseCalendar").hidden = true;
      _e("exquillaUseCalendar").checked = false;
    }
    serverPageValidate();
    if (!exquilla.AW.didAutodiscover) {
      exquilla.AW.didAutodiscover = true;
      autodiscover(function() {
        if (validFullName()) {
          document.querySelector("wizard").advance();
        } else {
          _e("fullName").focus();
        }
      });
    }
  } catch(e) {log.warn(re(e));}}

  function validFullName() {
    return !!_e("fullName").value.trim();
  }

  function serverPageUnload(event)
  { try {
    if (!validFullName()) {
      event.preventDefault();
      _e("fullName").focus();
      Services.prompt.alert(window, null, _e("bundle_dom").getString("FormValidationValueMissing"));
      return false;
    }

    var fullName = _e("fullName").value.trim();
    var ewsServerUrl = _e("exquillaserverurl").value.trim();
    var useMail = _e("exquillaUseMail").checked;
    var useAB = _e("exquillaUseAB").checked;
    var useCalendar = _e("exquillaUseCalendar").checked;
    //var userName = _e("exquillaUserName").value;
    //var domain = _e("exquillaDomain").value;
    var password = _e("exquillaPassword").value;

    var pageData = parent.GetPageData();

    dump('ewsServerUrl is ' + ewsServerUrl + '\n');
    // we will use this for the host name, as well as set it for the ewsURL
    let uri = newParsingURI(ewsServerUrl);
    setPageData(pageData, "server", "hostname", uri.host);
    setPageData(pageData, "server", "ewsURL", ewsServerUrl);
    setPageData(pageData, "server", "useMail", useMail);
    setPageData(pageData, "server", "useAB", useAB);
    setPageData(pageData, "server", "useCalendar", useCalendar);
    setPageData(pageData, "identity", "fullName", fullName);
    //setPageData(pageData, "login", "username", userName);
    //setPageData(pageData, "login", "domain", domain);
    setPageData(pageData, "login", "password", password);

    return true;
  } catch (e) {log.warn(re(e));}}

  function ewsSetDefaultCopiesAndFoldersPrefs(identity, server, accountData)
  { try {
    // This method is used as a convenient location to do all manner of
    //  fixups for ews accounts

    // we default to junk processing off
    server.setIntValue('spamLevel', 0);
    // Tell startup not to reset old values to defaults
    server.setBoolValue("postExquilla17", true);
    // Tell startup not to fix false "Default" for smtp server
    server.setBoolValue("postExquilla19", true);

    // We want to make sure that we set preferences for the use... functions
    let ewsServer = safeGetJS(server, "EwsIncomingServer");
    if (ewsServer)
    {
      ewsServer.useAB = accountData.incomingServer['ServerType-exquilla'].useAB;
      ewsServer.useCalendar = accountData.incomingServer['ServerType-exquilla'].useCalendar;
      ewsServer.useMail = accountData.incomingServer['ServerType-exquilla'].useMail;

      // add the host to ntlm hosts
      manageNtlmUri(ewsServer.ewsURL, true);
    }
    if (!ewsServer.useMail)
      return;

    // xxx todo: if we start with mail disabled, and enable it later, then how do
    //           these connections get made?
    let rootMsgFolder = server.rootFolder
                              .QueryInterface(Ci.nsIMsgFolder);
    let folderDelim = "/";

    // We use internal names known to everyone like Sent, Templates and Drafts

    let draftFolder = "Drafts";
    let stationeryFolder = "Templates";
    let fccFolder = "Sent";
    let archivesFolder = "Archives";

    // We must create the local draft and sent folder, giving it a correct
    //  distinguished folder id to hook up with the EWS equivalent.
    let draftMsgFolder;
    try {
      draftMsgFolder = rootMsgFolder.getChildNamed(draftFolder);
    } catch (e) {
      draftMsgFolder = rootMsgFolder.addSubfolder(draftFolder);
    }
    draftMsgFolder.setFlag(Ci.nsMsgFolderFlags.Drafts);
    let draftEwsFolder = safeGetJS(draftMsgFolder, "EwsMsgFolder");
    draftEwsFolder.distinguishedFolderId = 'drafts';

    let fccMsgFolder;
    try {
      fccMsgFolder = rootMsgFolder.getChildNamed(fccFolder);
    } catch (e) {
      fccMsgFolder = rootMsgFolder.addSubfolder(fccFolder);
    }
    fccMsgFolder.setFlag(Ci.nsMsgFolderFlags.SentMail);
    let fccEwsFolder = safeGetJS(fccMsgFolder, "EwsMsgFolder");
    fccEwsFolder.distinguishedFolderId = 'sentitems';

    /* Ews does not seem to have the concept of a templates folder. So we will
        for now use a templates folder located in local folders
        TODO: localize this name */
    verifyLocalFoldersAccount(); // from AccountWizard.js
    let localRootMsgFolder = MailServices.accounts
                                         .localFoldersServer
                                         .rootFolder;
    localRootMsgFolder instanceof Ci.nsIMsgLocalMailFolder;
    let stationeryMsgFolder;
    try {
      stationeryMsgFolder = localRootMsgFolder.getChildNamed(stationeryFolder);
    } catch (e) {
      stationeryMsgFolder = localRootMsgFolder.createLocalSubfolder(stationeryFolder);
    }

    let archivesMsgFolder;
    try {
      archivesMsgFolder = localRootMsgFolder.getChildNamed(archivesFolder);
    } catch (e) {
      archivesMsgFolder = localRootMsgFolder.createLocalSubfolder(archivesFolder);
    }
    if (archivesMsgFolder)
      archivesMsgFolder.setFlag(Ci.nsMsgFolderFlags.Archive);

    identity.draftFolder = rootMsgFolder.server.serverURI + folderDelim + draftFolder;
    identity.stationeryFolder = localRootMsgFolder.server.serverURI + folderDelim + stationeryFolder;
    identity.archiveFolder = localRootMsgFolder.server.serverURI + folderDelim + archivesFolder;
    identity.fccFolder = rootMsgFolder.server.serverURI + folderDelim + encodeURIComponent(fccFolder);
    log.debug("fccFolder set to " + identity.fccFolder);

    identity.fccFolderPickerMode = "1";
    identity.draftsFolderPickerMode = "1";
    identity.archivesFolderPickerMode = "0";
    identity.tmplFolderPickerMode = "0";
    identity.smtpServerKey = server.key;
  } catch(e) {log.warn(re(e));}}

  /**/
  function autodiscover(successCallback)
  {
    let localScope = {};
    try {

    try {
      localScope = ChromeUtils.import("resource://exquilla/autodiscover.js");
    } catch(e) {
      //dump('did not find autodiscover in the extension resources, showing error path\n');
      //try {re(e);} catch(e) {}
      // in testing, use the standard modules location
      localScope = ChromeUtils.import("resource:///modules/autodiscover.js");
    }
    let EwsAutoDiscover = localScope.EwsAutoDiscover;

    let pageData = parent.GetPageData();
    let email = pageData.identity.email.value;
    let usernameExplicit = pageData.login.username.value;
    let username = usernameExplicit.length? usernameExplicit : email;
    let domain = pageData.login.domain.value;
    let password = pageData.login.password.value;
    let savePassword = pageData.login.savePassword.value;
    _e("exquillaadresult").value =
      exquillaStrings.GetStringFromName("exquilla.Inprogress");
    _e("exquillaAutoURL").setAttribute("status", "loading");
    function setStatus(text) {
      _e("exquillaadresult").value =
        exquillaStrings.GetStringFromName("exquilla.Inprogress") + (text ? (" " + text) : "");
    }
    adListener.successCallback = successCallback;

    return EwsAutoDiscover.doAutodiscover(email, username, domain, password, savePassword, adListener, window, setStatus);
  } catch (e) {log.warn(re(e));}}
  /**/
  let adListener = {
    handleAutodiscover: function handleAutodiscover(aStatus, aResult, aDisplayName, aFoundSite)
    { try {
      log.debug("handleAutodiscover  status=" + aStatus + " foundSite " + aFoundSite);
      let resultString = '';
      if (aFoundSite)
      {
        // The user may have changed password in an authentication dialog.
        _e("exquillaPassword").value = aResult.mPassword;
        _e("exquillaAutoURL").setAttribute("status", "pending");
        _e("exquillaadresult").value =
         exquillaStrings.GetStringFromName("UrlTestInProgress");
         if (aDisplayName) {
           _e("fullName").value = aDisplayName;
         }
        ewsTestUrl([aResult.mEwsUrl, aResult.mInternalEwsUrl, aResult.mEwsOWAGuessUrl], aResult.mAuthMethod, this.successCallback);
      }
      else
      {
        _e("exquillaAutoURL").setAttribute("status", "error");
        if (aStatus < 1000) // html error
          resultString = "HTML# ";
        resultString += aStatus + " " + exquillaStrings.GetStringFromName("exquilla.Failure");
        _e("exquillaserverurl").value = "";
        alertAutodiscover(aFoundSite, null);
      }
      _e("exquillaadresult").value = resultString;
    } catch (e) {log.warn(re(e));}}
  };

  function onSetCredentialsType()
  { try {
    let usernameElement = _e("exquillaUserName");
    let domainElement = _e("exquillaDomain");
    let useEmail = _e("exquillaUseEmailCredentials").selected;
    if (useEmail)
    {
      usernameElement.disabled = true;
      usernameElement.value = "";
      domainElement.disabled = true;
      domainElement.value = "";
      ewsIdentityPageValidate();
    }
    else
    {
      usernameElement.disabled = false;
      if (!usernameElement.value.length)
        usernameElement.value = usernameElement.placeholder;
      domainElement.disabled = false;
      if (!domainElement.value.length)
        domainElement.value = domainElement.placeholder;
    }
  } catch(e) {dump(e + '\n');}}

  function ewsTestUrl(aUrls, aAuthMethod, successCallback)
  {
    let listener = {
      ewsUrl: "",
      mailbox: null,
      addedNtlmSpec: false,
      lastErrorMessage: "",
      onEvent: function _onEvent(aItem, aEvent, aData, aResult)
      {
        if (aEvent == "PasswordChanged")
        {
          let pageData = GetPageData();
          // The user was prompted and returned a password. Change it here as well.
          pageData.login.username.value = this.mailbox.username;
          pageData.login.password.value = this.mailbox.password;
          pageData.login.domain.value = this.mailbox.domain;
        }

        if (aEvent == "StopMachine")
        {
          if (_e("exquillaSavePassword").checked) {
            let localScope = {};
            try {
              localScope = ChromeUtils.import("resource://exquilla/autodiscover.js");
            } catch(e) {
              localScope = ChromeUtils.import("resource:///modules/autodiscover.js");
            }
            let uri = newParsingURI(this.ewsUrl);
            localScope.savePassword(uri.prePath, this.mailbox.username, this.mailbox.domain, this.mailbox.password);
          }
          let nativeService = new EwsNativeService();
          nativeService.removeNativeMailbox(this.mailbox);
          let authMethod = this.mailbox.authMethod;
          this.mailbox = null;

          // remove temporarily added ntlm host
          if (this.addedNtlmSpec)
            manageNtlmUri(this.ewsUrl, false);

          if (aResult == Cr.NS_OK)
          {
            if (_e("exquillaAutoURL").getAttribute("status") == "pending")
            {
              _e("exquillaadresult").value = exquillaStrings.GetStringFromName("exquilla.Success");
              _e("exquillaAutoURL").setAttribute("status", "success");
            }
            _e("exquillaUrlResult").value = exquillaStrings.GetStringFromName("UrlTestSuccess");
            _e("exquillaManualURL").setAttribute("status", "success");
            document.querySelector("wizard").canAdvance = true;
            gCurrentAccountData.incomingServer.authMethod = authMethod;
            if (successCallback) {
              successCallback();
            }
          }
          else
          {
            _e("exquillaUrlResult").value = exquillaStrings.GetStringFromName("UrlTestFailed");
            _e("exquillaManualURL").setAttribute("status", "error");
            // try another result
            this.nextUrl();
          }
        }
      },

      nextUrl: async function _nextUrl()
      {
        document.querySelector("wizard").canAdvance = false;
        while ( (this.ewsUrl = aUrls.shift()) && this.ewsUrl)
        {
          if (!this.ewsUrl.length)
            continue;
          log.debug("nextUrl() for url " + this.ewsUrl);
          try
          {
            _e("exquillaserverurl").value = this.ewsUrl;
            // test if the ews url is valid
            let pageData = parent.GetPageData();
            let email = pageData.identity.email.value;
            let usernameExplicit = pageData.login.username.value;
            let username = usernameExplicit.length ? usernameExplicit : email;
            let domain = pageData.login.domain.value;

            // Because the password might have been reset in
            // an authentication dialog, use the current value,
            // not that from when the identity page was unload.
            let password = _e("exquillaPassword").value;
;
            // We use the passed-in URL as the server URI, but that is not the serverURI that will
            //  be used by skink. We don't care, at the native level it is just used to cache the mailbox
            let nativeService = new EwsNativeService();
            this.mailbox = nativeService.getNativeMailbox(encodeURI(this.ewsUrl));

            // temporarily add the host to the allowable ntlm uris
            this.addedNtlmSpec = manageNtlmUri(this.ewsUrl, true);

            this.mailbox.username = username;
            this.mailbox.password = password;
            this.mailbox.domain = domain;
            this.mailbox.email = email;
            this.mailbox.ewsURL = this.ewsUrl;
            if (aAuthMethod == Ci.nsMsgAuthMethod.anything) {
              try {
                if (await this.mailbox.oAuth2Login.isOffice365()) {
                  this.mailbox.authMethod = await this.mailbox.oAuth2Login.detectAuthMethod();
                } else {
                  this.mailbox.authMethod = Ci.nsMsgAuthMethod.passwordCleartext;
                }
              } catch (ex) {
                log.warn(ex);
                this.lastErrorMessage = ex.message;
                return this.onEvent(null, "StopMachine", null, ex.result || Cr.NS_ERROR_FAILURE);
              }
            } else {
              this.mailbox.authMethod = aAuthMethod;
            }
            _e("exquillaUrlResult").value =
              exquillaStrings.GetStringFromName("UrlTestInProgress");
            _e("exquillaManualURL").setAttribute("status", "loading");
            this.mailbox.checkOnline(this);
            return;
          }
          catch(e) {log.warn(e);}
        }
        // no successful ews url found
        if (_e("exquillaAutoURL").getAttribute("status") == "pending")
        {
          // all URLs failed while testing autodiscover
          _e("exquillaAutoURL").setAttribute("status", "failure");
          alertAutodiscover(true, this.lastErrorMessage);
        }
      },
    };

    listener.nextUrl();
  }

  // globally accessible objects
  let pub = {};
  pub.serverPageInit = serverPageInit;
  pub.serverPageUnload = serverPageUnload;
  pub.overrideAccountWizard = overrideAccountWizard;
  pub.autodiscover = autodiscover;
  pub.onAccountWizardLoad = ewsOnAccountWizardLoad;
  pub.onAccountWizardUnload = ewsOnAccountWizardUnload;
  pub.identityPageValidate = ewsIdentityPageValidate;
  pub.onUseAutodiscovery = ewsOnUseAutodiscovery;
  pub.donePageInit = ewsDonePageInit;
  pub.identityPageUnload = ewsIdentityPageUnload;
  pub.onSetCredentialsType = onSetCredentialsType;
  pub.serverPageValidate = serverPageValidate;
  pub.ewsTestUrl = ewsTestUrl;
  return pub;
})();
