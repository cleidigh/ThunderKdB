/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource:///modules/hostnameUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");

/**
 * This is the dialog opened by menu File | New account | Mail... .
 *
 * It gets the user's realname, email address and password,
 * and automatically configures the LEAP account from that.
 *
 * Steps:
 * - User enters realname, email address and password
 * - verify the setup, by trying to login to the configured servers
 * - let user verify and maybe edit the server names and ports
 * - If user clicks OK, create the account
 */


// from http://xyfer.blogspot.com/2005/01/javascript-regexp-email-validator.html
var emailRE = /^[-_a-z0-9\'+*$^&%=~!?{}]+(?:\.[-_a-z0-9\'+*$^&%=~!?{}]+)*@(?:[-a-z0-9.]+\.[a-z]{2,6}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i;

if (typeof gEmailWizardLogger == "undefined") {
    Cu.import("resource:///modules/gloda/log4moz.js");
    let gEmailWizardLogger = Log4Moz.getConfiguredLogger("mail.wizard");
}

var gStringsBundle;
var gAccountWizardStringsBundle;
var gBrandShortName;

function e(elementID)
{
  return document.getElementById(elementID);
};

function _hide(id)
{
  e(id).hidden = true;
}

function _show(id)
{
  e(id).hidden = false;
}

function _enable(id)
{
  e(id).disabled = false;
}

function _disable(id)
{
  e(id).disabled = true;
}

function setText(id, value)
{
  var element = e(id);
  assert(element, "setText() on non-existant element ID");

  if (element.localName == "textbox" || element.localName == "label") {
    element.value = value;
  } else if (element.localName == "description") {
    element.textContent = value;
  } else {
    throw new NotReached("XUL element type not supported");
  }
}

function BitmaskAccountWizard()
{
  this._init();
}
BitmaskAccountWizard.prototype =
{
  _init : function BitmaskAccountWizard__init()
  {
    gEmailWizardLogger.info("Initializing setup wizard");
    this._abortable = null;
  },

  onLoad : function()
  {
    /**
     * this._currentConfig is the config we got either from the XML file or
     * from guessing or from the user. Unless it's from the user, it contains
     * placeholders like %EMAILLOCALPART% in username and other fields.
     *
     * The config here must retain these placeholders, to be able to
     * adapt when the user enters a different realname, or password or
     * email local part. (A change of the domain name will trigger a new
     * detection anyways.)
     * That means, before you actually use the config (e.g. to create an
     * account or to show it to the user), you need to run replaceVariables().
     */
    this._currentConfig = null;

    let userFullname;
    try {
      let userInfo = Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo);
      userFullname = userInfo.fullname;
    } catch(e) {
      // nsIUserInfo may not be implemented on all platforms, and name might
      // not be avaialble even if it is.
    }

    this._domain = "";
    this._email = "";
    this._realname = (userFullname) ? userFullname : "";
    e("realname").value = this._realname;
    this._password = "";
    this._okCallback = null;

    if (window.arguments && window.arguments[0]) {
      if (window.arguments[0].msgWindow) {
        this._parentMsgWindow = window.arguments[0].msgWindow;
      }
      if (window.arguments[0].okCallback) {
        this._okCallback = window.arguments[0].okCallback;
      }
    }

    gEmailWizardLogger.info("Email account setup dialog loaded.");

    gStringsBundle = e("accountCreationStrings");
    gAccountWizardStringsBundle = e("accountWizardStrings");
    gBrandShortName = e("bundle_brand").getString("brandShortName");

    // First, unhide the main window areas, and store the width,
    // so that we don't resize wildly when we unhide areas.
    // switchToMode() will then hide the unneeded parts again.
    // We will add some leeway of 10px, in case some of the <description>s wrap,
    // e.g. outgoing username != incoming username.
    _show("status_area");
    _show("result_area");
    window.sizeToContent();
    e("mastervbox").setAttribute("style",
        "min-width: " + document.width + "px; " +
        "min-height: " + (document.height + 10) + "px;");

    this.switchToMode("start");
    e("realname").focus();
  },

  /**
   * Changes the window configuration to the different modes we have.
   * Shows/hides various window parts and buttons.
   * @param modename {String-enum}
   *    "start" : Just the realname, email address, password fields
   *    "result" : We found a config and display it to the user.
   *       The user may create the account.
   */
  switchToMode : function(modename)
  {
    if (modename == this._currentModename) {
      return;
    }
    this._currentModename = modename;
    gEmailWizardLogger.info("switching to UI mode " + modename)

    //_show("initialSettings"); always visible
    //_show("cancel_button"); always visible
    if (modename == "start") {
      _hide("status_area");
      _hide("result_area");

      _show("next_button");
      _disable("next_button"); // will be enabled by code
      _hide("create_button");
    } else if (modename == "result") {
      _show("status_area");
      _show("result_area");

      _hide("next_button");
      _show("create_button");
      _enable("create_button");
    } else {
      throw new NotReached("unknown mode");
    }
    window.sizeToContent();
  },

  /**
   * Start from beginning with possibly new email address.
   */
  onStartOver : function()
  {
    if (this._abortable) {
      this.onStop();
    }
    this.switchToMode("start");
  },

  getConcreteConfig : function()
  {
    var result = this._currentConfig.copy();
    replaceVariables(result, this._realname, this._email, this._password);
    result.rememberPassword = true;
    return result;
  },

  /**
   * Get the IMAP an SMTP passwords from the bitmask_tokens file
   *
   * if the file doesn't exist we'll use a dummy password to provide
   * support for bitmask < 0.9.2
   */
  getPasswordsFromFile : function()
  {
    let path = OS.Path.join(OS.Constants.Path.tmpDir,
                            "bitmask_tokens",
                            this._email + ".json");
    let file_promise = OS.File.read(path);
    file_promise.then(data => {
      let decoder = new TextDecoder();
      this._password = JSON.parse(decoder.decode(data))["mail_auth"];
    }, ex => { // error reading
      this._password = "123";
    });
    return file_promise;
  },

  /*
   * This checks if the email address is at least possibly valid, meaning it
   * has an '@' before the last char.
   */
  validateEmailMinimally : function(emailAddr)
  {
    let atPos = emailAddr.lastIndexOf("@");
    return atPos > 0 && atPos + 1 < emailAddr.length;
  },

  /*
   * This checks if the email address is syntactically valid,
   * as far as we can determine. We try hard to make full checks.
   *
   * OTOH, we have a very small chance of false negatives,
   * because the RFC822 address spec is insanely complicated,
   * but rarely needed, so when this here fails, we show an error message,
   * but don't stop the user from continuing.
   * In contrast, if validateEmailMinimally() fails, we stop the user.
   */
  validateEmail : function(emailAddr)
  {
    return emailRE.test(emailAddr);
  },

  /**
   * onInputEmail and onInputRealname are called on input = keypresses, and
   * enable/disable the next button based on whether there's a semi-proper
   * e-mail address and non-blank realname to start with.
   *
   * A change to the email address also automatically restarts the
   * whole process.
   */
  onInputEmail : function()
  {
    this._email = e("email").value;
    this.onStartOver();
    this.checkStartDone();
  },
  onInputRealname : function()
  {
    this._realname = e("realname").value;
    this.checkStartDone();
  },

  /**
   * This does very little other than to check that a name was entered at all
   * Since this is such an insignificant test we should be using a very light
   * or even jovial warning.
   */
  onBlurRealname : function()
  {
    let realnameEl = e("realname");
    if (this._realname) {
      this.clearError("nameerror");
      _show("nametext");
      realnameEl.removeAttribute("error");
    // bug 638790: don't show realname error until user enter an email address
    } else if (this.validateEmailMinimally(this._email)) {
      _hide("nametext");
      this.setError("nameerror", "please_enter_name");
      realnameEl.setAttribute("error", "true");
    }
  },

  /**
   * This check is only done as an informative warning.
   * We don't want to block the person, if they've entered an email address
   * that doesn't conform to our regex.
   */
  onBlurEmail : function()
  {
    if (!this._email) {
      return;
    }
    var emailEl = e("email");
    if (this.validateEmail(this._email)) {
      this.clearError("emailerror");
      emailEl.removeAttribute("error");
      this.onBlurRealname();
    } else {
      this.setError("emailerror", "double_check_email");
      emailEl.setAttribute("error", "true");
    }
  },

  /**
   * @see onBlurPassword()
   */
  onFocusPassword : function()
  {
    e("password").type = "password";
  },

  /**
   * Check whether the user entered the minimum of information
   * needed to leave the "start" mode (entering of name, email, pw)
   * and is allowed to proceed to detection step.
   */
  checkStartDone : function()
  {
    if (this.validateEmailMinimally(this._email) &&
        this._realname) {
      this._domain = this._email.split("@")[1].toLowerCase();
      _enable("next_button");
    } else {
      _disable("next_button");
    }
  },

  /**
   * When the [Continue] button is clicked, we move from the initial account
   * information stage to using that information to configure account details.
   */
  onNext : function()
  {
    let promise = this.getPasswordsFromFile();
    promise.then(none => { this.fillConfig(this._domain, this._email); })
           .catch(Components.utils.reportError);
    return promise;
  },

  fillConfig : function(domain, email)
  {
    var config = new AccountConfig();
    this._prefillConfig(config);
    config.source = AccountConfig.kSourceXML;  // TODO: change kSource type?
    config.incoming.hostname = IMAP_HOST;
    config.incoming.username = config.identity.emailAddress;
    config.outgoing.username = config.identity.emailAddress;
    config.incoming.type = "imap";
    config.incoming.port = IMAP_PORT;
    // Values for socketType are:
    //   1 - plain
    //   2 - SSL / TLS
    //   3 - STARTTLS
    config.incoming.socketType = 1;
    config.incoming.auth = Ci.nsMsgAuthMethod.passwordCleartext;
    config.outgoing.hostname = SMTP_HOST;
    config.outgoing.socketType = 1;
    config.outgoing.port = SMTP_PORT;
    config.outgoing.auth = Ci.nsMsgAuthMethod.passwordCleartext;
    this.foundConfig(config);
  },

  /**
   * When findConfig() was successful, it calls this.
   * This displays the config to the user.
   */
  foundConfig : function(config)
  {
    gEmailWizardLogger.info("foundConfig()");
    assert(config instanceof AccountConfig,
        "BUG: Arg 'config' needs to be an AccountConfig object");

    this._haveValidConfigForDomain = this._email.split("@")[1];;

    if (!this._realname || !this._email) {
      return;
    }
    this._foundConfig2(config);
  },

  // Continuation of foundConfig2() after custom fields.
  _foundConfig2 : function(config)
  {
    this.displayConfigResult(config);
  },




  ///////////////////////////////////////////////////////////////////
  // status area

  startSpinner : function(actionStrName)
  {
    e("status_area").setAttribute("status", "loading");
    gEmailWizardLogger.warn("spinner start " + actionStrName);
    this._showStatusTitle(actionStrName, gStringsBundle);
  },

  stopSpinner : function(actionStrName)
  {
    e("status_area").setAttribute("status", "result");
    _hide("stop_button");
    this._showStatusTitle(actionStrName, gStringsBundle);
    gEmailWizardLogger.warn("all spinner stop " + actionStrName);
  },

  showErrorStatus : function(actionStrName)
  {
    e("status_area").setAttribute("status", "error");
    gEmailWizardLogger.warn("status error " + actionStrName);
    this._showStatusTitle(actionStrName, gAccountWizardStringsBundle);
  },

  _showStatusTitle : function(msgName, bundle)
  {
    let msg = " "; // assure height. Do via min-height in CSS, for 2 lines?
    try {
      if (msgName) {
        msg = bundle.getFormattedString(msgName, [gBrandShortName]);
      }
    } catch(ex) {
      gEmailWizardLogger.error("missing string for " + msgName);
      msg = msgName + " (missing string in translation!)";
    }

    e("status_msg").textContent = msg;
    gEmailWizardLogger.info("status msg: " + msg);
  },



  /////////////////////////////////////////////////////////////////
  // Result area

  /**
   * Displays a (probed) config to the user,
   * in the result config details area.
   *
   * @param config {AccountConfig} The config to present to user
   */
  displayConfigResult : function(config)
  {
    assert(config instanceof AccountConfig);
    this._currentConfig = config;
    var configFilledIn = this.getConcreteConfig();

    var unknownString = gStringsBundle.getString("resultUnknown");

    function _makeHostDisplayString(server, stringName)
    {
      let type = gStringsBundle.getString(sanitize.translate(server.type,
          { imap : "resultIMAP", pop3 : "resultPOP3", smtp : "resultSMTP" }),
          unknownString);
      let host = server.hostname +
          (isStandardPort(server.port) ? "" : ":" + server.port);
      //let ssl = gStringsBundle.getString(sanitize.translate(server.socketType,
      //    { 1 : "resultNoEncryption", 2 : "resultSSL", 3 : "resultSTARTTLS" }),
      //    unknownString);
      //let certStatus = gStringsBundle.getString(server.badCert ?
      //    "resultSSLCertWeak" : "resultSSLCertOK");
      return gAccountWizardStringsBundle.getFormattedString(stringName,
          [ type, host ]);
    };

    var incomingResult = unknownString;
    if (configFilledIn.incoming.hostname) {
      incomingResult = _makeHostDisplayString(configFilledIn.incoming,
          "resultIncoming");
    }

    var outgoingResult = unknownString;
    if (!config.outgoing.existingServerKey) {
      if (configFilledIn.outgoing.hostname) {
        outgoingResult = _makeHostDisplayString(configFilledIn.outgoing,
            "resultOutgoing");
      }
    } else {
      outgoingResult = gStringsBundle.getString("resultOutgoingExisting");
    }

    var usernameResult;
    if (configFilledIn.incoming.username == configFilledIn.outgoing.username) {
      usernameResult = gStringsBundle.getFormattedString("resultUsernameBoth",
            [ configFilledIn.incoming.username || unknownString ]);
    } else {
      usernameResult = gStringsBundle.getFormattedString(
            "resultUsernameDifferent",
            [ configFilledIn.incoming.username || unknownString,
              configFilledIn.outgoing.username || unknownString ]);
    }

    setText("result-incoming", incomingResult);
    setText("result-outgoing", outgoingResult);
    setText("result-username", usernameResult);

    gEmailWizardLogger.info(debugObject(config, "config"));
    // IMAP / POP dropdown
    var lookForAltType =
        config.incoming.type == "imap" ? "pop3" : "imap";
    var alternative = null;
    for (let i = 0; i < config.incomingAlternatives.length; i++) {
      let alt = config.incomingAlternatives[i];
      if (alt.type == lookForAltType) {
        alternative = alt;
        break;
      }
    }
    if (alternative) {
      _show("result_imappop");
      e("result_select_" + alternative.type).configIncoming = alternative;
      e("result_select_" + config.incoming.type).configIncoming =
          config.incoming;
      e("result_imappop").value =
          config.incoming.type == "imap" ? 1 : 2;
    } else {
      _hide("result_imappop");
    }

    this.switchToMode("result");
  },

  onInputUsername : function()
  {
    this.onChangedManualEdit();
  },
  onInputHostname : function()
  {
    this.onChangedManualEdit();
  },



  /////////////////////////////////////////////////////////////////
  // UI helper functions

  _prefillConfig : function(initialConfig)
  {
    var emailsplit = this._email.split("@");
    assert(emailsplit.length > 1);
    var emaillocal = sanitize.nonemptystring(emailsplit[0]);
    initialConfig.incoming.username = emaillocal;
    initialConfig.outgoing.username = SMTP_USER;
    return initialConfig;
  },

  clearError : function(which)
  {
    _hide(which);
    _hide(which + "icon");
    e(which).textContent = "";
  },

  setError : function(which, msg_name)
  {
    try {
      _show(which);
      _show(which + "icon");
      e(which).textContent = gStringsBundle.getString(msg_name);
      window.sizeToContent();
    } catch (ex) { alertPrompt("missing error string", msg_name); }
  },



  /////////////////////////////////////////////////////////////////
  // Finish & dialog close functions

  onKeyDown : function(event)
  {
    let key = event.keyCode;
    if (key == 27) { // Escape key
      this.onCancel();
      return true;
    }
    if (key == 13) { // OK key
      let buttons = [
        { id: "next_button", action: makeCallback(this, this.onNext) },
        { id: "create_button", action: makeCallback(this, this.onCreate) },
      ];
      for (let button of buttons) {
        button.e = e(button.id);
        if (button.e.hidden || button.e.disabled) {
          continue;
        }
        button.action();
        return true;
      }
    }
    return false;
  },

  onCancel : function()
  {
    window.close();
    // The window onclose handler will call onWizardShutdown for us.
  },

  onWizardShutdown : function()
  {
    if (this._abortable) {
      this._abortable.cancel(new UserCancelledException());
    }

    if (this._okCallback) {
      this._okCallback();
    }
    gEmailWizardLogger.info("Shutting down email config dialog");
  },


  onCreate : function()
  {
    try {
      gEmailWizardLogger.info("Create button clicked");

      this.validateAndFinish();
    } catch (ex) {
      gEmailWizardLogger.error("Error creating account.  ex=" + ex +
                               ", stack=" + ex.stack);
      alertPrompt(gStringsBundle.getString("error_creating_account"), ex);
    }
  },

  // called by onCreate()
  validateAndFinish : function()
  {
    var configFilledIn = this.getConcreteConfig();

    if (checkIncomingServerAlreadyExists(configFilledIn)) {
      alertPrompt(gStringsBundle.getString("error_creating_account"),
                  gStringsBundle.getString("incoming_server_exists"));
      return;
    }

    if (configFilledIn.outgoing.addThisServer) {
      let existingServer = checkOutgoingServerAlreadyExists(configFilledIn);
      if (existingServer) {
        configFilledIn.outgoing.addThisServer = false;
        configFilledIn.outgoing.existingServerKey = existingServer.key;
      }
    }

    // TODO use a UI mode (switchToMode()) for verfication, too.
    // But we need to go back to the previous mode, because we might be in
    // "result" or "manual-edit-complete" mode.
    _disable("create_button");
    // no stop button: backend has no ability to stop :-(
    var self = this;
    this.startSpinner("checking_password");
    // logic function defined in verifyConfig.js
    verifyConfig(
      configFilledIn,
      // guess login config?
      configFilledIn.source != AccountConfig.kSourceXML,
      // TODO Instead, the following line would be correct, but I cannot use it,
      // because some other code doesn't adhere to the expectations/specs.
      // Find out what it was and fix it.
      //concreteConfig.source == AccountConfig.kSourceGuess,
      this._parentMsgWindow,
      function(successfulConfig) // success
      {
        self.stopSpinner(successfulConfig.incoming.password ?
                         "password_ok" : null);

        // the auth might have changed, so we
        // should back-port it to the current config.
        self._currentConfig.incoming.auth = successfulConfig.incoming.auth;
        self._currentConfig.outgoing.auth = successfulConfig.outgoing.auth;
        self._currentConfig.incoming.username = successfulConfig.incoming.username;
        self._currentConfig.outgoing.username = successfulConfig.outgoing.username;
        self.finish();
      },
      function(e) // failed
      {
        self.showErrorStatus("config_unverifiable");
        // TODO bug 555448: wrong error msg, there may be a 1000 other
        // reasons why this failed, and this is misleading users.
        //self.setError("passworderror", "user_pass_invalid");
        // TODO use switchToMode(), see above
        // give user something to proceed after fixing
        _enable("create_button");
      });
  },

  finish : function()
  {
    gEmailWizardLogger.info("creating account in backend");
    createAccountInBackend(this.getConcreteConfig());
    window.close();
  },
};

var gBitmaskAccountWizard = new BitmaskAccountWizard();

var _gStandardPorts = {};
_gStandardPorts["imap"] = [ 143, 993 ];
_gStandardPorts["pop3"] = [ 110, 995 ];
_gStandardPorts["smtp"] = [ 587, 25, 465 ]; // order matters
var _gAllStandardPorts = _gStandardPorts["smtp"]
    .concat(_gStandardPorts["imap"]).concat(_gStandardPorts["pop3"]);

function isStandardPort(port)
{
  return _gAllStandardPorts.indexOf(port) != -1;
}

function getStandardPorts(protocolType)
{
  return _gStandardPorts[protocolType];
}
