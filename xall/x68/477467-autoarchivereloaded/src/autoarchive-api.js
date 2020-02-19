"use strict";
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    let GlobalStates;
    (function (GlobalStates) {
        GlobalStates[GlobalStates["UNINITIALZED"] = 0] = "UNINITIALZED";
        GlobalStates[GlobalStates["READY_FOR_WORK"] = 1] = "READY_FOR_WORK";
        GlobalStates[GlobalStates["IN_PROGRESS"] = 2] = "IN_PROGRESS";
    })(GlobalStates = AutoarchiveReloaded.GlobalStates || (AutoarchiveReloaded.GlobalStates = {}));
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
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
var autoarchive = class extends ExtensionCommon.ExtensionAPI {
    constructor() {
        super(...arguments);
        this.legacyOptions = new LegacyOptions();
    }
    getAPI(context) {
        return {
            autoarchive: {
                askForLegacyPreferences: async (accounts) => {
                    log.info("askForLegacyPreferences");
                    try {
                        return this.legacyOptions.askForLegacyPreferences(accounts);
                    }
                    catch (e) {
                        log.error(e);
                        throw e;
                    }
                },
                setInfoLogging: (value) => {
                    logLevelInfo.enableInfoLogging = value;
                },
            },
        };
    }
};
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
let iteratorUtils = ChromeUtils.import("resource:///modules/iteratorUtils.jsm");
let mailservices = ChromeUtils.import("resource:///modules/MailServices.jsm");
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
class LogLevelInfo {
    constructor() {
        this.enableInfoLogging = false;
    }
    log(value) {
        console.log(value);
    }
}
let logLevelInfo = new LogLevelInfo();
const log = new Logger(logLevelInfo);
