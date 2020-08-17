var autoarchive =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
Copyright 2013-2019 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
Copyright 2012 Alexey Egorov (original version Autoarchive, http://code.google.com/p/autoarchive/ )

 This file is part of AutoarchiveReloaded.

    AutoarchiveReloaded is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    AutoarchiveReloaded is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with AutoarchiveReloaded.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const LegacyOptions_1 = __webpack_require__(1);
const Logger_1 = __webpack_require__(2);
class autoarchive extends ExtensionCommon.ExtensionAPI {
    constructor() {
        super(...arguments);
        this.legacyOptions = new LegacyOptions_1.LegacyOptions();
    }
    getAPI(context) {
        return {
            autoarchive: {
                askForLegacyPreferences: (accounts) => {
                    Logger_1.log.info("askForLegacyPreferences");
                    try {
                        return this.legacyOptions.askForLegacyPreferences(accounts);
                    }
                    catch (e) {
                        Logger_1.log.error(e);
                        throw e;
                    }
                },
                setInfoLogging: (value) => {
                    Logger_1.logLevelInfo.enableInfoLogging = value;
                },
            },
        };
    }
}
exports.default = autoarchive;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
Copyright 2013-2019 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
Copyright 2012 Alexey Egorov (original version Autoarchive, http://code.google.com/p/autoarchive/ )

 This file is part of AutoarchiveReloaded.

    AutoarchiveReloaded is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    AutoarchiveReloaded is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with AutoarchiveReloaded.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const iteratorUtils = Components.utils.import("resource:///modules/iteratorUtils.jsm");
const mailservices = Components.utils.import("resource:///modules/MailServices.jsm");
class LegacyOptions {
    askForLegacyPreferences(accounts) {
        const legacySettings = this.getLegacyOptions(accounts);
        this.markLegacySettingsAsMigrated();
        return legacySettings;
    }
    getLegacyOptions(accounts) {
        const prefBranch = this.getInternalLegacyPrefBranch();
        if (prefBranch.getBoolPref("preferencesAlreadyMigrated", false)) {
            return null;
        }
        const accountSettings = this.getLegacyAccountSettings(accounts);
        const aChildArray = prefBranch.getChildList("", {});
        if ((aChildArray.length === 0) && Object.keys(accountSettings).length === 0) {
            return null;
        }
        const legacySettings = {
            globalSettings: {
                archiveType: prefBranch.getCharPref("archiveType", undefined),
                enableInfoLogging: prefBranch.getBoolPref("enableInfoLogging", undefined),
            },
            accountSettings: accountSettings,
        };
        return legacySettings;
    }
    markLegacySettingsAsMigrated() {
        this.getInternalLegacyPrefBranch().setBoolPref("preferencesAlreadyMigrated", true);
    }
    getLegacyAccountSettings(accountInfos) {
        const accountSettings = {};
        for (const accountInfo of accountInfos) {
            const accounts = iteratorUtils.fixIterator(mailservices.MailServices.accounts.accounts, Ci.nsIMsgAccount);
            let account;
            for (const currentAccount of accounts) {
                if (currentAccount.key === accountInfo.accountId) {
                    account = currentAccount;
                    break;
                }
            }
            if (account == null) {
                continue;
            }
            const server = account.incomingServer;
            const settingOfAccount = {
                bArchiveOther: server.getBoolValue("archiveMessages"),
                daysOther: server.getIntValue("archiveMessagesDays"),
                bArchiveMarked: server.getBoolValue("archiveStarred"),
                daysMarked: server.getIntValue("archiveStarredDays"),
                bArchiveTagged: server.getBoolValue("archiveTagged"),
                daysTagged: server.getIntValue("archiveTaggedDays"),
                bArchiveUnread: server.getBoolValue("archiveUnread"),
                daysUnread: server.getIntValue("archiveUnreadDays"),
            };
            if (settingOfAccount.bArchiveOther || settingOfAccount.bArchiveMarked || settingOfAccount.bArchiveTagged || settingOfAccount.bArchiveUnread) {
                accountSettings[account.key] = settingOfAccount;
            }
        }
        return accountSettings;
    }
    getInternalLegacyPrefBranch() {
        const prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        return prefs.getBranch("extensions.AutoarchiveReloaded.");
    }
}
exports.LegacyOptions = LegacyOptions;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
Copyright 2013-2019 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
Copyright 2012 Alexey Egorov (original version Autoarchive, http://code.google.com/p/autoarchive/ )

 This file is part of AutoarchiveReloaded.

    AutoarchiveReloaded is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    AutoarchiveReloaded is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with AutoarchiveReloaded.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __webpack_require__(3);
class LogLevelInfoWebexperiment {
    constructor() {
        this.enableInfoLogging = false;
    }
    log(value) {
        console.log(value);
    }
}
exports.logLevelInfo = new LogLevelInfoWebexperiment();
exports.log = new Logger_1.Logger(exports.logLevelInfo);


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
Copyright 2018-2019 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

 This file is part of AutoarchiveReloaded.

    AutoarchiveReloaded is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    AutoarchiveReloaded is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with AutoarchiveReloaded.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["LEVEL_INFO"] = 0] = "LEVEL_INFO";
    LogLevel[LogLevel["LEVEL_ERROR"] = 1] = "LEVEL_ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(logLevelInfo) {
        this.logLevelInfo = logLevelInfo;
    }
    info(str) {
        this.log(LogLevel.LEVEL_INFO, str);
    }
    error(str) {
        this.log(LogLevel.LEVEL_ERROR, str);
    }
    errorException(exception, message) {
        if (message === undefined) {
            this.error("Exception occured");
        }
        else {
            this.error(message);
        }
        this.logAny(exception);
    }
    getLogLevelFromPref() {
        if (this.logLevelInfo.enableInfoLogging) {
            return LogLevel.LEVEL_INFO;
        }
        return LogLevel.LEVEL_ERROR;
    }
    log(levelToLog, str) {
        if (levelToLog < this.getLogLevelFromPref()) {
            return;
        }
        this.logEntry(levelToLog, str);
    }
    logEntry(levelToLog, str) {
        const date = new Date();
        let strToLog = date.toLocaleString() + " - AutoarchiveReloaded - ";
        if (levelToLog === LogLevel.LEVEL_INFO) {
            strToLog += "INFO";
        }
        else {
            strToLog += "ERROR";
        }
        strToLog += ": " + str;
        this.logAny(strToLog);
    }
    logAny(value) {
        console.log(value);
    }
}
exports.Logger = Logger;


/***/ })
/******/ ])["default"];