/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


"use strict";

const {
  manager: Cm,
  Constructor: CC
} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);

const subprocess = ChromeUtils.import("chrome://enigmail/content/modules/subprocess.jsm").subprocess;
const EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
const EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;

// load all modules lazily to avoid possible cross-reference errors
const getEnigmailConsole = EnigmailLazy.loader("enigmail/pipeConsole.jsm", "EnigmailConsole");
const getEnigmailGpgAgent = EnigmailLazy.loader("enigmail/gpgAgent.jsm", "EnigmailGpgAgent");
const getEnigmailMimeEncrypt = EnigmailLazy.loader("enigmail/mimeEncrypt.jsm", "EnigmailMimeEncrypt");
const getEnigmailProtocolHandler = EnigmailLazy.loader("enigmail/protocolHandler.jsm", "EnigmailProtocolHandler");
const getEnigmailFiltersWrapper = EnigmailLazy.loader("enigmail/filtersWrapper.jsm", "EnigmailFiltersWrapper");
const getEnigmailLog = EnigmailLazy.loader("enigmail/log.jsm", "EnigmailLog");
const getEnigmailOS = EnigmailLazy.loader("enigmail/os.jsm", "EnigmailOS");
const getEnigmailLocale = EnigmailLazy.loader("enigmail/locale.jsm", "EnigmailLocale");
const getEnigmailCommandLine = EnigmailLazy.loader("enigmail/commandLine.jsm", "EnigmailCommandLine");
const getEnigmailPrefs = EnigmailLazy.loader("enigmail/prefs.jsm", "EnigmailPrefs");
const getEnigmailVerify = EnigmailLazy.loader("enigmail/mimeVerify.jsm", "EnigmailVerify");
const getEnigmailWindows = EnigmailLazy.loader("enigmail/windows.jsm", "EnigmailWindows");
const getEnigmailDialog = EnigmailLazy.loader("enigmail/dialog.jsm", "EnigmailDialog");
const getEnigmailConfigure = EnigmailLazy.loader("enigmail/configure.jsm", "EnigmailConfigure");
const getEnigmailApp = EnigmailLazy.loader("enigmail/app.jsm", "EnigmailApp");
const getMsgRead = EnigmailLazy.loader("enigmail/msgRead.jsm", "EnigmailMsgRead");
const getEnigmailKeyRefreshService = EnigmailLazy.loader("enigmail/keyRefreshService.jsm", "EnigmailKeyRefreshService");
const getEnigmailKeyServer = EnigmailLazy.loader("enigmail/keyserver.jsm", "EnigmailKeyServer");
const getEnigmailWksMimeHandler = EnigmailLazy.loader("enigmail/wksMimeHandler.jsm", "EnigmailWksMimeHandler");
const getEnigmailPEPAdapter = EnigmailLazy.loader("enigmail/pEpAdapter.jsm", "EnigmailPEPAdapter");
const getEnigmailOverlays = EnigmailLazy.loader("enigmail/enigmailOverlays.jsm", "EnigmailOverlays");
const getEnigmailSqlite = EnigmailLazy.loader("enigmail/sqliteDb.jsm", "EnigmailSqliteDb");
const getEnigmailGnuPGUpdate = EnigmailLazy.loader("enigmail/gnupgUpdate.jsm", "EnigmailGnuPGUpdate");
const getEnigmailTimer = EnigmailLazy.loader("enigmail/timer.jsm", "EnigmailTimer");
const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

var EXPORTED_SYMBOLS = ["EnigmailCore"];

// Interfaces
const nsIEnvironment = Ci.nsIEnvironment;
const APP_STARTUP = 1;

var gPreferredGpgPath = null;
var gOverwriteEnvVar = [];
var gEnigmailService = null; // Global Enigmail Service

var gEnvList = null; // currently filled from enigmail.js

var EnigmailCore = {
  /**
   * Create a new instance of Enigmail, or return the already existing one
   */
  createInstance: function() {
    if (!gEnigmailService) {
      gEnigmailService = new Enigmail();
    }

    return gEnigmailService;
  },

  startup: function(reason) {
    let self = this;
    let observerFired = 0;

    let env = getEnvironment();
    initializeLogDirectory();
    initializeLogging(env);

    const logger = getEnigmailLog();

    logger.DEBUG("core.jsm: startup()\n");

    getEnigmailSqlite().checkDatabaseStructure();
    getEnigmailPrefs().startup(reason);

    this.factories = [];

    function initService() {
      if (observerFired > 0) return;

      ++observerFired;
      const configuredVersion = getEnigmailPrefs().getPref("configuredVersion");

      if (configuredVersion && configuredVersion.length > 0) {
        self.createInstance();
        if (!gEnigmailService.initialized) {
          // try to initialize Enigmail
          gEnigmailService.initialize(null, getEnigmailApp().getVersion());
        }
      }
    }

    function continueStartup(type) {
      logger.DEBUG(`core.jsm: startup.continueStartup(${type})\n`);

      try {
        let mimeEncrypt = getEnigmailMimeEncrypt();
        mimeEncrypt.startup(reason);
        getEnigmailOverlays().startup();
        self.factories.push(new Factory(getEnigmailProtocolHandler()));
        self.factories.push(new Factory(mimeEncrypt.Handler));

        if (isGecko52() || reason !== APP_STARTUP) {
          // Postbox or while not starting up
          initService();
        }

      }
      catch (ex) {
        gEnigmailService = null;
        logger.DEBUG("core.jsm: startup.continueStartup: error " + ex.message + "\n" + ex.stack + "\n");
      }
    }

    if ((!isGecko52()) && reason === APP_STARTUP) {
      // if TB starts up, observe "mail-tabs-session-restored"
      Services.obs.addObserver(initService, "mail-tabs-session-restored", false);
    }

    getEnigmailVerify().registerContentTypeHandler();
    getEnigmailWksMimeHandler().registerContentTypeHandler();
    getEnigmailFiltersWrapper().onStartup();
    getMsgRead().onStartup();
    getEnigmailPEPAdapter().initialize().then(r => {
      continueStartup(0);
    }).catch(r => {
      continueStartup(1);
    });
  },

  shutdown: function(reason) {
    getEnigmailLog().DEBUG("core.jsm: shutdown():\n");

    let cLineReg = getEnigmailCommandLine().categoryRegistry;
    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    catMan.deleteCategoryEntry(cLineReg.category, cLineReg.entry, false);

    if (this.factories) {
      for (let fct of this.factories) {
        fct.unregister();
      }
    }

    getMsgRead().onShutdown();
    getEnigmailFiltersWrapper().onShutdown();
    getEnigmailPEPAdapter().onShutdown();
    getEnigmailVerify().unregisterContentTypeHandler();

    getEnigmailGpgAgent().finalize();
    getEnigmailLocale().shutdown();
    getEnigmailLog().onShutdown();

    getEnigmailLog().setLogLevel(3);
    gEnigmailService = null;
  },

  version: "",

  init: function(enigmailVersion) {
    this.version = enigmailVersion;
  },

  /**
   * get and or initialize the Enigmail service,
   * including the handling for upgrading old preferences to new versions
   *
   * @win:                - nsIWindow: parent window (optional)
   * @startingPreferences - Boolean: true - called while switching to new preferences
   *                        (to avoid re-check for preferences)
   */
  getService: function(win, startingPreferences) {
    // Lazy initialization of Enigmail JS component (for efficiency)

    if (gEnigmailService) {
      return gEnigmailService.initialized ? gEnigmailService : null;
    }

    try {
      this.createInstance();
      return gEnigmailService.getService(win, startingPreferences);
    }
    catch (ex) {
      return null;
    }

  },

  getEnigmailService: function() {
    return gEnigmailService;
  },

  setEnigmailService: function(v) {
    gEnigmailService = v;
  },

  /**
   * obtain a list of all environment variables
   *
   * @return: Array of Strings with the following structrue
   *          variable_name=variable_content
   */
  getEnvList: function() {
    return gEnvList;
  },

  addToEnvList: function(str) {
    gEnvList.push(str);
  },

  setEnvVariable: function(varname, value) {
    for (let i = 0; i < gEnvList.length; i++) {
      if (gEnvList[i].startsWith(varname + "=")) {
        gEnvList[i] = varname + "=" + value;
        break;
      }
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// Enigmail encryption/decryption service
///////////////////////////////////////////////////////////////////////////////

function getLogDirectoryPrefix() {
  try {
    return getEnigmailPrefs().getPrefBranch().getCharPref("logDirectory") || "";
  }
  catch (ex) {
    return "";
  }
}

function initializeLogDirectory() {
  const prefix = getLogDirectoryPrefix();
  if (prefix) {
    getEnigmailLog().setLogLevel(5);
    getEnigmailLog().setLogDirectory(prefix);
    getEnigmailLog().DEBUG("core.jsm: Logging debug output to " + prefix + "/enigdbug.txt\n");
  }
}

function initializeLogging(env) {
  const nspr_log_modules = env.get("NSPR_LOG_MODULES");
  const matches = nspr_log_modules.match(/enigmail.js:(\d+)/);

  if (matches && (matches.length > 1)) {
    getEnigmailLog().setLogLevel(Number(matches[1]));
    getEnigmailLog().WARNING("core.jsm: Enigmail: LogLevel=" + matches[1] + "\n");
  }
}

function initializeSubprocessLogging(env) {
  const nspr_log_modules = env.get("NSPR_LOG_MODULES");
  const matches = nspr_log_modules.match(/subprocess:(\d+)/);

  subprocess.registerLogHandler(function(txt) {
    getEnigmailLog().ERROR("subprocess.jsm: " + txt);
  });

  if (matches && matches.length > 1 && matches[1] > 2) {
    subprocess.registerDebugHandler(function(txt) {
      getEnigmailLog().DEBUG("subprocess.jsm: " + txt);
    });
  }
}

function initializeAgentInfo() {
  if (!getEnigmailOS().isDosLike && !getEnigmailGpgAgent().isDummy()) {
    EnigmailCore.addToEnvList("GPG_AGENT_INFO=" + getEnigmailGpgAgent().gpgAgentInfo.envStr);
  }
}

function failureOn(ex, status) {
  status.initializationError = getEnigmailLocale().getString("enigmailNotAvailable");
  getEnigmailLog().ERROR("core.jsm: Enigmail.initialize: Error - " + status.initializationError + "\n");
  getEnigmailLog().DEBUG("core.jsm: Enigmail.initialize: exception=" + ex.toString() + "\n");
  throw Components.results.NS_ERROR_FAILURE;
}

function getEnvironment(status) {
  try {
    return Cc["@mozilla.org/process/environment;1"].getService(nsIEnvironment);
  }
  catch (ex) {
    failureOn(ex, status);
  }
  return null;
}

function initializeEnvironment(env) {
  // Initialize global environment variables list
  let passEnv = ["GNUPGHOME", "GPGDIR", "ETC",
    "ALLUSERSPROFILE", "APPDATA", "LOCALAPPDATA", "BEGINLIBPATH",
    "COMMONPROGRAMFILES", "COMSPEC", "DBUS_SESSION_BUS_ADDRESS", "DISPLAY",
    "ENIGMAIL_PASS_ENV", "ENDLIBPATH",
    "GTK_IM_MODULE",
    "HOME", "HOMEDRIVE", "HOMEPATH",
    "LOCPATH", "LOGNAME", "LD_LIBRARY_PATH", "MOZILLA_FIVE_HOME",
    "NLSPATH", "PATH", "PATHEXT", "PINENTRY_USER_DATA", "PROGRAMFILES", "PWD",
    "QT_IM_MODULE",
    "SHELL", "SYSTEMDRIVE", "SYSTEMROOT",
    "TEMP", "TMP", "TMPDIR", "TZ", "TZDIR", "UNIXROOT",
    "USER", "USERPROFILE", "WINDIR", "XAUTHORITY",
    "XMODIFIERS"
  ];

  gEnvList = [];

  // if (!getEnigmailPrefs().getPref("gpgLocaleEn")) {
  //   passEnv = passEnv.concat([
  //     "LANG", "LANGUAGE", "LC_ALL", "LC_COLLATE", "LC_CTYPE",
  //     "LC_MESSAGES", "LC_MONETARY", "LC_NUMERIC", "LC_TIME"
  //   ]);
  // }
  // else if (getEnigmailOS().getOS() === "WINNT") {
  //   // force output on Windows to EN-US
  //   EnigmailCore.addToEnvList("LC_ALL=en_US");
  //   EnigmailCore.addToEnvList("LANG=en_US");
  // }

  EnigmailCore.addToEnvList("LC_ALL=C");
  EnigmailCore.addToEnvList("LANG=C");

  const passList = env.get("ENIGMAIL_PASS_ENV");
  if (passList) {
    const passNames = passList.split(":");
    for (var k = 0; k < passNames.length; k++) {
      passEnv.push(passNames[k]);
    }
  }

  for (var j = 0; j < passEnv.length; j++) {
    const envName = passEnv[j];
    let envValue;

    if (envName in gOverwriteEnvVar) {
      envValue = gOverwriteEnvVar[envName];
    }
    else {
      envValue = env.get(envName);
    }
    if (envValue) {
      EnigmailCore.addToEnvList(envName + "=" + envValue);
    }
  }

  getEnigmailLog().DEBUG("core.jsm: Enigmail.initialize: Ec.envList = " + gEnvList + "\n");
}


function Enigmail() {
  this.wrappedJSObject = this;
}

Enigmail.prototype = {
  initialized: false,
  initializationAttempted: false,
  initializationError: "",

  initialize: function(domWindow, version) {
    this.initializationAttempted = true;

    getEnigmailLog().DEBUG("core.jsm: Enigmail.initialize: START\n");

    if (this.initialized) return;

    this.environment = getEnvironment(this);

    initializeSubprocessLogging(this.environment);
    initializeEnvironment(this.environment);

    try {
      getEnigmailConsole().write("Initializing Enigmail service ...\n");
    }
    catch (ex) {
      failureOn(ex, this);
    }

    getEnigmailGpgAgent().setAgentPath(domWindow, this, gPreferredGpgPath);
    getEnigmailGpgAgent().detectGpgAgent(domWindow, this);

    initializeAgentInfo();

    getEnigmailKeyRefreshService().start(getEnigmailKeyServer());

    this.initialized = true;

    getEnigmailTimer().setTimeout(
      function() {
        getEnigmailGnuPGUpdate().runUpdateCheck();
      }, 240); // wait 4 minutes before starting the update checker
    getEnigmailLog().DEBUG("core.jsm: Enigmail.initialize: END\n");
  },

  reinitialize: function() {
    getEnigmailLog().DEBUG("core.jsm: Enigmail.reinitialize:\n");
    this.initialized = false;
    this.initializationAttempted = true;

    getEnigmailConsole().write("Reinitializing Enigmail service ...\n");
    initializeEnvironment(this.environment);
    getEnigmailGpgAgent().setAgentPath(null, this, gPreferredGpgPath);
    this.initialized = true;
  },

  perferGpgPath: function(gpgPath) {
    getEnigmailLog().DEBUG("core.jsm: Enigmail.perferGpgPath = " + gpgPath + "\n");
    gPreferredGpgPath = gpgPath;
  },

  overwriteEnvVar: function(envVar) {
    let envLines = envVar.split(/\n/);

    gOverwriteEnvVar = [];
    for (let i = 0; i < envLines.length; i++) {
      let j = envLines[i].indexOf("=");
      if (j > 0) {
        gOverwriteEnvVar[envLines[i].substr(0, j)] = envLines[i].substr(j + 1);
      }
    }
  },

  getService: function(win, startingPreferences) {
    getEnigmailLog().DEBUG("core.jsm: getService()\n");

    if (!win) {
      win = getEnigmailWindows().getBestParentWin();
    }

    if (!this.initialized) {
      const firstInitialization = !this.initializationAttempted;

      try {
        // Initialize enigmail
        EnigmailCore.init(getEnigmailApp().getVersion());
        this.initialize(win, getEnigmailApp().getVersion());

        try {
          // Reset alert count to default value
          getEnigmailPrefs().getPrefBranch().clearUserPref("initAlert");
        }
        catch (ex) {}
      }
      catch (ex) {
        getEnigmailConsole().write(`Exception: ${ex.toString()}`);
        if (firstInitialization) {
          // Display initialization error alert
          const errMsg = (this.initializationError ? this.initializationError : getEnigmailLocale().getString("accessError")) +
            "\n\n" + getEnigmailLocale().getString("initErr.howToFixIt");

          const checkedObj = {
            value: false
          };
          if (getEnigmailPrefs().getPref("initAlert")) {
            const r = getEnigmailDialog().longAlert(win, "Enigmail: " + errMsg,
              getEnigmailLocale().getString("dlgNoPrompt"),
              null, getEnigmailLocale().getString("initErr.setupWizard.button"),
              null, checkedObj);
            if (r >= 0 && checkedObj.value) {
              getEnigmailPrefs().setPref("initAlert", false);
            }
            if (r == 1) {
              // start setup wizard
              getEnigmailWindows().openSetupWizard(win, false);
              return Enigmail.getService(win);
            }
          }
          if (getEnigmailPrefs().getPref("initAlert")) {
            this.initializationAttempted = false;
            gEnigmailService = null;
          }
        }

        return null;
      }

      const configuredVersion = getEnigmailPrefs().getPref("configuredVersion");

      getEnigmailLog().DEBUG("core.jsm: getService: last used version: " + configuredVersion + "\n");
      getEnigmailConsole().write("last used version: " + configuredVersion + "\n");


      if (firstInitialization && this.initialized &&
        getEnigmailGpgAgent().agentType === "pgp") {
        getEnigmailDialog().alert(win, getEnigmailLocale().getString("pgpNotSupported"));
      }

      if (this.initialized && (getEnigmailApp().getVersion() != configuredVersion)) {
        getEnigmailConfigure().configureEnigmail(win, startingPreferences);
      }
    }

    return this.initialized ? this : null;
  }
}; // Enigmail.prototype


class Factory {
  constructor(component) {
    this.component = component;
    this.register();
    Object.freeze(this);
  }

  createInstance(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return new this.component();
  }

  register() {
    Cm.registerFactory(this.component.prototype.classID,
      this.component.prototype.classDescription,
      this.component.prototype.contractID,
      this);
  }

  unregister() {
    Cm.unregisterFactory(this.component.prototype.classID, this);
  }
}

function isGecko52() {
  // determine if Platform is Mozilla 52
  const vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
  const appVer = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).platformVersion;

  return vc.compare(appVer, "53.0") < 0;
}
