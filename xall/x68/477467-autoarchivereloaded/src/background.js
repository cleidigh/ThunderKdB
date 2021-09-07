/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2019-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.log = exports.LogLevelInfoWebExtension = void 0;
const Logger_1 = __webpack_require__(2);
class LogLevelInfoWebExtension {
    static setGlobaleEnableInfoLogging(value) {
        browser.extension.getBackgroundPage()[LogLevelInfoWebExtension.ENABLE_INFO_LOGGING_NAME] = value;
    }
    static getGlobalEnableInfoLogging() {
        return browser.extension.getBackgroundPage()[LogLevelInfoWebExtension.ENABLE_INFO_LOGGING_NAME];
    }
    get enableInfoLogging() {
        return LogLevelInfoWebExtension.getGlobalEnableInfoLogging();
    }
}
exports.LogLevelInfoWebExtension = LogLevelInfoWebExtension;
LogLevelInfoWebExtension.ENABLE_INFO_LOGGING_NAME = "WebExtensionLoggerHelper_enableInfoLogging";
exports.log = new Logger_1.Logger(new LogLevelInfoWebExtension());


/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports) => {


/*!
Copyright 2018-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Logger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["info"] = 0] = "info";
    LogLevel[LogLevel["error"] = 1] = "error";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(logLevelInfo) {
        this.logLevelInfo = logLevelInfo;
    }
    info(str) {
        this.log(LogLevel.info, str);
    }
    error(str) {
        this.log(LogLevel.error, str);
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
            return LogLevel.info;
        }
        return LogLevel.error;
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
        if (levelToLog === LogLevel.info) {
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


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2018-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OptionHelper = void 0;
const AccountInfo_1 = __webpack_require__(4);
const DefaultSettings_1 = __webpack_require__(6);
const LoggerWebextension_1 = __webpack_require__(1);
class OptionHelper {
    async loadCurrentSettings() {
        LoggerWebextension_1.log.info("start to load current settings");
        const accounts = await AccountInfo_1.AccountInfoProvider.askForAccounts();
        try {
            LoggerWebextension_1.log.info("got info about accounts");
            const result = await browser.storage.local.get("settings");
            LoggerWebextension_1.log.info("loaded settings from storage");
            const oHandling = new DefaultSettings_1.DefaultSettings();
            const settings = oHandling.convertPartialSettings(result.settings);
            this.ensureEveryExistingAccountHaveSettings(accounts, settings, oHandling);
            this.removeOutdatedAccountsFromSettings(settings, accounts);
            LoggerWebextension_1.log.info("settings mixed with default settings");
            return settings;
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    removeOutdatedAccountsFromSettings(settings, accounts) {
        for (const accountId in settings.accountSettings) {
            if (AccountInfo_1.AccountInfoProvider.findAccountInfo(accounts, accountId) === null) {
                delete settings.accountSettings[accountId];
            }
        }
    }
    ensureEveryExistingAccountHaveSettings(accounts, settings, oHandling) {
        accounts.forEach((account) => {
            const accountSetting = settings.accountSettings[account.accountId];
            if (accountSetting === undefined) {
                settings.accountSettings[account.accountId] = oHandling.getDefaultAccountSettings();
            }
        });
    }
    async initializePreferencesAtStartup() {
        try {
            await this.publishCurrentPreferencesForLogging();
            LoggerWebextension_1.log.info("publishCurrentPreferencesForLogging done");
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    async savePreferencesAndPublishForLogging(settings) {
        LoggerWebextension_1.log.info("going to save settings");
        try {
            await browser.storage.local.set({ settings: settings });
            LoggerWebextension_1.log.info("settings saved");
            await this.publishCurrentPreferencesForLogging();
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    async publishCurrentPreferencesForLogging() {
        const settings = await this.loadCurrentSettings();
        LoggerWebextension_1.log.info("loadCurrentSettings done, publish for logging");
        try {
            LoggerWebextension_1.LogLevelInfoWebExtension.setGlobaleEnableInfoLogging(settings.globalSettings.enableInfoLogging);
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
}
exports.OptionHelper = OptionHelper;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AccountInfoProvider = void 0;
const LoggerWebextension_1 = __webpack_require__(1);
const AccountIterator_1 = __webpack_require__(5);
class AccountInfoProvider {
    static isMailType(account) {
        return account.type === "pop3" || account.type === "imap" || account.type === "exquilla";
    }
    static findAccountInfo(accountSettings, id) {
        for (const accountSetting of accountSettings) {
            if (accountSetting.accountId === id) {
                return accountSetting;
            }
        }
        return null;
    }
    static async askForAccounts() {
        try {
            const nsAccounts = [];
            await AccountIterator_1.AccountIterator.forEachAccount((account, isAccountArchivable) => {
                if (isAccountArchivable) {
                    nsAccounts.push(account);
                }
            });
            nsAccounts.sort((a, b) => {
                const mailTypeA = AccountInfoProvider.isMailType(a);
                const mailTypeB = AccountInfoProvider.isMailType(b);
                if (mailTypeA === mailTypeB) {
                    return a.name.localeCompare(b.name);
                }
                if (mailTypeA) {
                    return -1;
                }
                return 1;
            });
            const accounts = [];
            let currentOrder = 0;
            nsAccounts.forEach((account) => {
                accounts.push({
                    accountId: account.id,
                    accountName: account.name,
                    order: currentOrder++,
                });
            });
            return accounts;
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
}
exports.AccountInfoProvider = AccountInfoProvider;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AccountIterator = void 0;
class AccountIterator {
    static async forEachAccount(forEachDo) {
        const accounts = await browser.accounts.list();
        for (const account of accounts) {
            await forEachDo(account, this.isAccountArchivable(account));
        }
    }
    static isAccountArchivable(account) {
        return (account.type === "pop3" ||
            account.type === "imap" ||
            account.type === "rss" ||
            account.type === "nntp" ||
            account.type === "exquilla" ||
            account.type === "none");
    }
}
exports.AccountIterator = AccountIterator;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports) => {


/*!
Copyright 2018-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultSettings = void 0;
class DefaultSettings {
    getDefaultAccountSettings() {
        return {
            bArchiveOther: false,
            daysOther: 360,
            bArchiveMarked: false,
            daysMarked: 360,
            bArchiveTagged: false,
            daysTagged: 360,
            bArchiveUnread: false,
            daysUnread: 360,
        };
    }
    convertPartialSettings(partialSettings) {
        const defaultSettings = this.getDefaultSettings();
        const concatedSettings = this.deepMerge(defaultSettings, partialSettings);
        for (const accountId in concatedSettings.accountSettings) {
            if (concatedSettings.accountSettings.hasOwnProperty(accountId)) {
                const accountSetting = concatedSettings.accountSettings[accountId];
                concatedSettings.accountSettings[accountId] = this.deepMerge(this.getDefaultAccountSettings(), accountSetting);
            }
        }
        return concatedSettings;
    }
    deepMerge(defaultValues, valuesToMerge) {
        if (valuesToMerge === undefined || valuesToMerge === null) {
            return defaultValues;
        }
        const clone = Object.assign({}, defaultValues);
        for (const key in valuesToMerge) {
            if (valuesToMerge.hasOwnProperty(key)) {
                const elem = valuesToMerge[key];
                if (elem !== undefined && elem !== null) {
                    if (typeof elem !== "object") {
                        clone[key] = elem;
                    }
                    else {
                        clone[key] = this.deepMerge(clone[key], elem);
                    }
                }
            }
        }
        return clone;
    }
    getDefaultSettings() {
        return {
            globalSettings: this.getDefaultGlobalSettings(),
            accountSettings: {},
        };
    }
    getDefaultGlobalSettings() {
        return {
            archiveType: "manual",
            enableInfoLogging: false,
        };
    }
}
exports.DefaultSettings = DefaultSettings;


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MainFunctions = void 0;
const GlobalStates_1 = __webpack_require__(8);
const LoggerWebextension_1 = __webpack_require__(1);
const optionHelper_1 = __webpack_require__(3);
const AppInfoLogger_1 = __webpack_require__(9);
const Archiver_1 = __webpack_require__(10);
class MainFunctions {
    static async startupAndInitialzeAutomaticArchiving() {
        LoggerWebextension_1.log.info("start...");
        const appInfoLogger = new AppInfoLogger_1.AppInfoLogger();
        await appInfoLogger.log();
        this.status = GlobalStates_1.GlobalStates.readyForWork;
        LoggerWebextension_1.log.info("ready for work");
        const optionHelper = new optionHelper_1.OptionHelper();
        const settings = await optionHelper.loadCurrentSettings();
        if (settings.globalSettings.archiveType === "startup") {
            LoggerWebextension_1.log.info("archive type at startup");
            setTimeout(this.onDoArchiveAutomatic.bind(this), 9000);
            setInterval(this.onDoArchiveAutomatic.bind(this), 86400000);
        }
        else {
            LoggerWebextension_1.log.info("archive type manually");
        }
    }
    static getStatus() {
        return this.status;
    }
    static async onArchiveManually() {
        await this.onDoArchive();
    }
    static onDoArchiveAutomatic() {
        LoggerWebextension_1.log.info("try automatic archive");
        if (this.status !== GlobalStates_1.GlobalStates.readyForWork) {
            LoggerWebextension_1.log.info("automatic archive busy, wait");
            setTimeout(this.onDoArchiveAutomatic.bind(this), 5000);
        }
        else {
            void this.onDoArchive();
        }
    }
    static async onDoArchive() {
        LoggerWebextension_1.log.info("start archiving");
        this.status = GlobalStates_1.GlobalStates.inProgress;
        const autoarchiveReloaded = new Archiver_1.Archiver();
        await autoarchiveReloaded.archiveAccounts();
        LoggerWebextension_1.log.info("archive (searching messages to archive) done");
        this.status = GlobalStates_1.GlobalStates.readyForWork;
    }
}
exports.MainFunctions = MainFunctions;
MainFunctions.status = GlobalStates_1.GlobalStates.uninitialized;


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports) => {


/*!
Copyright 2020-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GlobalStates = void 0;
var GlobalStates;
(function (GlobalStates) {
    GlobalStates[GlobalStates["uninitialized"] = 0] = "uninitialized";
    GlobalStates[GlobalStates["readyForWork"] = 1] = "readyForWork";
    GlobalStates[GlobalStates["inProgress"] = 2] = "inProgress";
})(GlobalStates = exports.GlobalStates || (exports.GlobalStates = {}));


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppInfoLogger = void 0;
const AccountIterator_1 = __webpack_require__(5);
const LoggerWebextension_1 = __webpack_require__(1);
class AppInfoLogger {
    async log() {
        await this.logAppInfo();
        this.logAddonInfo();
        await this.logAccountInfo();
    }
    async logAppInfo() {
        try {
            const window = browser.extension.getBackgroundPage();
            const browserInfo = await browser.runtime.getBrowserInfo();
            LoggerWebextension_1.log.info("Application: " + browserInfo.vendor + " " + browserInfo.name + " version " + browserInfo.version + " (" + browserInfo.buildID + ")");
            LoggerWebextension_1.log.info("SystemInfo: " + window.navigator.userAgent + "| " + window.navigator.platform);
            LoggerWebextension_1.log.info("Language: " + window.navigator.language);
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
        }
    }
    logAddonInfo() {
    }
    async logAccountInfo() {
        try {
            await AccountIterator_1.AccountIterator.forEachAccount((account, isAccountArchivable) => {
                LoggerWebextension_1.log.info(`Account Info: '${account.name}'; type: ${account.type}; id: ${account.id}; isAccountArchivable: ${isAccountArchivable}`);
            });
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
        }
    }
}
exports.AppInfoLogger = AppInfoLogger;


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Archiver = void 0;
const AccountIterator_1 = __webpack_require__(5);
const LoggerWebextension_1 = __webpack_require__(1);
const optionHelper_1 = __webpack_require__(3);
const SettingsHelper_1 = __webpack_require__(11);
const FolderHelper_1 = __webpack_require__(12);
class Archiver {
    async archiveAccounts() {
        try {
            const optionHelper = new optionHelper_1.OptionHelper();
            const settings = await optionHelper.loadCurrentSettings();
            await AccountIterator_1.AccountIterator.forEachAccount(async (account, isAccountArchivable) => {
                await this.archiveAccount(account, isAccountArchivable, settings);
            });
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    async archiveAccount(account, isAccountArchivable, settings) {
        LoggerWebextension_1.log.info("check account '" + account.name + "'");
        if (isAccountArchivable) {
            const accountSettings = settings.accountSettings[account.id];
            SettingsHelper_1.SettingsHelper.log(account.name, accountSettings);
            if (SettingsHelper_1.SettingsHelper.isArchivingSomething(accountSettings)) {
                LoggerWebextension_1.log.info("getting folders to archive in account '" + account.name + "'");
                const foldersToArchive = this.getFoldersToArchive(FolderHelper_1.FolderHelper.getFoldersRecursivly(account.folders));
                for (const folder of foldersToArchive) {
                    await this.archiveFolder(folder, accountSettings);
                }
            }
            else {
                LoggerWebextension_1.log.info("autoarchive disabled, ignore account '" + account.name + "'");
            }
        }
        else {
            LoggerWebextension_1.log.info("ignore account '" + account.name + "'");
        }
    }
    getFoldersToArchive(folders) {
        try {
            const foldersToArchive = [];
            for (const folder of folders) {
                const folderName = folder.name || "";
                const folderType = folder.type || "";
                LoggerWebextension_1.log.info(`Check folder ${folderName} (${folderType})`);
                if (this.folderShallBeIgnored(folder, folders)) {
                    LoggerWebextension_1.log.info(`ignore folder '${folder.path}' (${folderType})`);
                }
                else {
                    foldersToArchive.push(folder);
                }
            }
            return foldersToArchive;
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    folderShallBeIgnored(folder, allFoldersOfAccount) {
        if (this.folderTypeShallBeIgnored(folder.type)) {
            return true;
        }
        const parent = this.getFolderParent(folder, allFoldersOfAccount);
        if (parent === undefined) {
            return false;
        }
        return this.folderShallBeIgnored(parent, allFoldersOfAccount);
    }
    folderTypeShallBeIgnored(folderType) {
        return (folderType === "trash" ||
            folderType === "junk" ||
            folderType === "outbox" ||
            folderType === "drafts" ||
            folderType === "templates" ||
            folderType === "archives");
    }
    getFolderParent(folder, allFoldersOfAccount) {
        const nIndex = folder.path.lastIndexOf("/");
        if (nIndex === undefined) {
            return undefined;
        }
        const parentPath = folder.path.substring(0, nIndex);
        for (const currentFolder of allFoldersOfAccount) {
            if (currentFolder.path === parentPath) {
                return currentFolder;
            }
        }
        return undefined;
    }
    async archiveFolder(folder, settings) {
        try {
            const mailAccount = await browser.accounts.get(folder.accountId);
            const folderTye = folder.type || "";
            LoggerWebextension_1.log.info(`start searching messages to archive in folder '${folder.path}' (${folderTye}) in account '${mailAccount.name}'`);
            const messages = await this.searchMessagesToArchive(folder, settings);
            const folderName = folder.name || "";
            LoggerWebextension_1.log.info(`message search done for '${folderName}' in account '${mailAccount.name}' -> ${messages.length} messages found to archive`);
            if (messages.length > 0) {
                LoggerWebextension_1.log.info(`start real archiving of '${folderName}' (${messages.length} messages) in account '${mailAccount.name}'`);
                await this.archiveMessages(messages);
            }
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
            throw e;
        }
    }
    async searchMessagesToArchive(folder, settings) {
        const messages = [];
        let messageList;
        try {
            messageList = await browser.messages.list(folder);
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e, "The exception might occur because the folder is a virtual folder... See https://bugzilla.mozilla.org/show_bug.cgi?id=1529791");
            return messages;
        }
        this.detectMessagesToArchive(messageList, settings, messages);
        while (messageList.id) {
            messageList = await browser.messages.continueList(messageList.id);
            this.detectMessagesToArchive(messageList, settings, messages);
        }
        return messages;
    }
    detectMessagesToArchive(messageList, settings, messages) {
        for (const message of messageList.messages) {
            if (this.shallMessageBeArchived(message, settings)) {
                messages.push(message);
            }
        }
    }
    shallMessageBeArchived(messageHeader, settings) {
        let ageInDays = 0;
        let other = true;
        if (!messageHeader.read) {
            if (!settings.bArchiveUnread) {
                return false;
            }
            other = false;
            ageInDays = Math.max(ageInDays, settings.daysUnread);
        }
        if (messageHeader.flagged) {
            if (!settings.bArchiveMarked) {
                return false;
            }
            other = false;
            ageInDays = Math.max(ageInDays, settings.daysMarked);
        }
        const tags = messageHeader.tags.filter((tag) => tag !== "junk" && tag !== "nonjunk");
        if (tags.length > 0) {
            if (!settings.bArchiveTagged) {
                return false;
            }
            other = false;
            ageInDays = Math.max(ageInDays, settings.daysTagged);
        }
        if (other) {
            if (!settings.bArchiveOther) {
                return false;
            }
            ageInDays = Math.max(ageInDays, settings.daysOther);
        }
        const minDate = new Date(Date.now() - ageInDays * 24 * 60 * 60 * 1000);
        if (messageHeader.date > minDate) {
            return false;
        }
        return true;
    }
    async archiveMessages(messages) {
        try {
            const messageIds = [];
            for (const message of messages) {
                messageIds.push(message.id);
            }
            await browser.messages.archive(messageIds);
        }
        catch (e) {
            LoggerWebextension_1.log.errorException(e);
        }
    }
}
exports.Archiver = Archiver;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*!
Copyright 2013-2021 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SettingsHelper = void 0;
const LoggerWebextension_1 = __webpack_require__(1);
class SettingsHelper {
    static isArchivingSomething(accountSettings) {
        return accountSettings.bArchiveOther || accountSettings.bArchiveMarked || accountSettings.bArchiveTagged || accountSettings.bArchiveUnread;
    }
    static getMinAge(accountSettings) {
        let minAge = Number.MAX_VALUE;
        if (accountSettings.bArchiveOther) {
            minAge = Math.min(accountSettings.daysOther, minAge);
        }
        if (accountSettings.bArchiveMarked) {
            minAge = Math.min(accountSettings.daysMarked, minAge);
        }
        if (accountSettings.bArchiveTagged) {
            minAge = Math.min(accountSettings.daysTagged, minAge);
        }
        if (accountSettings.bArchiveUnread) {
            minAge = Math.min(accountSettings.daysUnread, minAge);
        }
        return minAge;
    }
    static log(accountName, accountSettings) {
        LoggerWebextension_1.log.info("Settings for '" + accountName + "':");
        LoggerWebextension_1.log.info(JSON.stringify(accountSettings));
    }
}
exports.SettingsHelper = SettingsHelper;


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports) => {


/*!
Copyright 2020-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FolderHelper = void 0;
class FolderHelper {
    static getFoldersRecursivly(folders) {
        if (folders === undefined) {
            return [];
        }
        let allFolders = [];
        for (const folder of folders) {
            allFolders.push(folder);
            allFolders = allFolders.concat(this.getFoldersRecursivly(folder.subFolders));
        }
        return allFolders;
    }
}
exports.FolderHelper = FolderHelper;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

/*!
Copyright 2019-2021 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
const LoggerWebextension_1 = __webpack_require__(1);
const optionHelper_1 = __webpack_require__(3);
const MainFunctions_1 = __webpack_require__(7);
async function startup() {
    try {
        LoggerWebextension_1.log.info("Autoarchive background script started");
        const optionHelper = new optionHelper_1.OptionHelper();
        await optionHelper.initializePreferencesAtStartup();
        await MainFunctions_1.MainFunctions.startupAndInitialzeAutomaticArchiving();
        browser.runtime.onMessage.addListener(handleMessage);
    }
    catch (e) {
        LoggerWebextension_1.log.errorException(e);
        throw e;
    }
}
function handleMessage(request, sender, sendResponse) {
    switch (request.message) {
        case "getArchiveStatus": {
            LoggerWebextension_1.log.info("background script getArchiveStatus");
            sendResponse({ status: MainFunctions_1.MainFunctions.getStatus() });
            break;
        }
        case "archiveManually": {
            LoggerWebextension_1.log.info("user choosed to archive manually");
            MainFunctions_1.MainFunctions.onArchiveManually();
            sendResponse(null);
            break;
        }
    }
}
startup();

})();

/******/ })()
;