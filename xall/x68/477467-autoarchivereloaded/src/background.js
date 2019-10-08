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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class AccountInfo {
        static isMailType(account) {
            return (account.type === "pop3" || account.type === "imap" || account.type === "exquilla");
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
                await AutoarchiveReloaded.AccountIterator.forEachAccount((account, isAccountArchivable) => {
                    if (isAccountArchivable) {
                        nsAccounts.push(account);
                    }
                });
                nsAccounts.sort((a, b) => {
                    const mailTypeA = AccountInfo.isMailType(a);
                    const mailTypeB = AccountInfo.isMailType(b);
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
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
    }
    AutoarchiveReloaded.AccountInfo = AccountInfo;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class AccountIterator {
        static async forEachAccount(forEachDo) {
            const accounts = await browser.accounts.list();
            for (const account of accounts) {
                await forEachDo(account, this.isAccountArchivable(account));
            }
        }
        static isAccountArchivable(account) {
            return (account.type === "pop3" || account.type === "imap" || account.type === "rss" || account.type === "nntp" || account.type === "exquilla");
        }
    }
    AutoarchiveReloaded.AccountIterator = AccountIterator;
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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
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
                    if ((elem !== undefined) && (elem !== null)) {
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
    AutoarchiveReloaded.DefaultSettings = DefaultSettings;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
/*!
Copyright 2019 Brummolix (new version AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class LogLevelInfo {
        static setGlobaleEnableInfoLogging(value) {
            browser.extension.getBackgroundPage()[LogLevelInfo.ENABLE_INFO_LOGGING_NAME] = value;
            browser.autoarchive.setInfoLogging(value);
        }
        static getGlobalEnableInfoLogging() {
            return browser.extension.getBackgroundPage()[LogLevelInfo.ENABLE_INFO_LOGGING_NAME];
        }
        get enableInfoLogging() {
            return LogLevelInfo.getGlobalEnableInfoLogging();
        }
    }
    LogLevelInfo.ENABLE_INFO_LOGGING_NAME = "WebExtensionLoggerHelper_enableInfoLogging";
    AutoarchiveReloaded.LogLevelInfo = LogLevelInfo;
    AutoarchiveReloaded.log = new Logger(new LogLevelInfo());
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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class OptionHelper {
        async loadCurrentSettings() {
            AutoarchiveReloaded.log.info("start to load current settings");
            const accounts = await AutoarchiveReloaded.AccountInfo.askForAccounts();
            try {
                AutoarchiveReloaded.log.info("got info about accounts");
                const result = await browser.storage.local.get("settings");
                AutoarchiveReloaded.log.info("loaded settings from storage");
                const oHandling = new AutoarchiveReloaded.DefaultSettings();
                const settings = oHandling.convertPartialSettings(result.settings);
                this.ensureEveryExistingAccountHaveSettings(accounts, settings, oHandling);
                this.removeOutdatedAccountsFromSettings(settings, accounts);
                AutoarchiveReloaded.log.info("settings mixed with default settings");
                return settings;
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
        removeOutdatedAccountsFromSettings(settings, accounts) {
            for (const accountId in settings.accountSettings) {
                if (AutoarchiveReloaded.AccountInfo.findAccountInfo(accounts, accountId) === null) {
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
            AutoarchiveReloaded.log.info("start conversion of legacy preferences (if any)");
            const accounts = await AutoarchiveReloaded.AccountInfo.askForAccounts();
            const settings = await browser.autoarchive.askForLegacyPreferences(accounts);
            try {
                if (settings) {
                    AutoarchiveReloaded.log.info("got legacy preferences to convert");
                    await this.savePreferencesAndPublishForLogging(settings);
                    AutoarchiveReloaded.log.info("legacy preferences converted");
                }
                else {
                    AutoarchiveReloaded.log.info("no legacy preferences to convert");
                    await this.publishCurrentPreferencesForLogging();
                    AutoarchiveReloaded.log.info("publishCurrentPreferencesForLogging done");
                }
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
        async savePreferencesAndPublishForLogging(settings) {
            AutoarchiveReloaded.log.info("going to save settings");
            try {
                await browser.storage.local.set({ settings: settings });
                AutoarchiveReloaded.log.info("settings saved");
                await this.publishCurrentPreferencesForLogging();
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
        async publishCurrentPreferencesForLogging() {
            const settings = await this.loadCurrentSettings();
            AutoarchiveReloaded.log.info("loadCurrentSettings done, publish for logging");
            try {
                AutoarchiveReloaded.LogLevelInfo.setGlobaleEnableInfoLogging(settings.globalSettings.enableInfoLogging);
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
    }
    AutoarchiveReloaded.OptionHelper = OptionHelper;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
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
                AutoarchiveReloaded.log.info("Application: " + browserInfo.vendor + " " + browserInfo.name + " version " + browserInfo.version + " (" + browserInfo.buildID + ")");
                AutoarchiveReloaded.log.info("SystemInfo: " + window.navigator.userAgent + "| " + window.navigator.platform);
                AutoarchiveReloaded.log.info("Language: " + window.navigator.language);
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
            }
        }
        logAddonInfo() {
        }
        async logAccountInfo() {
            try {
                await AutoarchiveReloaded.AccountIterator.forEachAccount((account, isAccountArchivable) => {
                    AutoarchiveReloaded.log.info("Account Info: '" + account.name + "'; type: " +
                        account.type + "; id: " + account.id);
                });
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
            }
        }
    }
    AutoarchiveReloaded.AppInfoLogger = AppInfoLogger;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class Archiver {
        async archiveAccounts() {
            try {
                const optionHelper = new AutoarchiveReloaded.OptionHelper();
                const settings = await optionHelper.loadCurrentSettings();
                await AutoarchiveReloaded.AccountIterator.forEachAccount(async (account, isAccountArchivable) => {
                    await this.archiveAccount(account, isAccountArchivable, settings);
                });
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
                throw e;
            }
        }
        async archiveAccount(account, isAccountArchivable, settings) {
            AutoarchiveReloaded.log.info("check account '" + account.name + "'");
            if (isAccountArchivable) {
                const accountSettings = settings.accountSettings[account.id];
                AutoarchiveReloaded.SettingsHelper.log(account.name, accountSettings);
                if (AutoarchiveReloaded.SettingsHelper.isArchivingSomething(accountSettings)) {
                    AutoarchiveReloaded.log.info("getting folders to archive in account '" + account.name + "'");
                    const foldersToArchive = this.getFoldersToArchive(account.folders);
                    for (const folder of foldersToArchive) {
                        await this.archiveFolder(folder, accountSettings);
                    }
                }
                else {
                    AutoarchiveReloaded.log.info("autoarchive disabled, ignore account '" + account.name + "'");
                }
            }
            else {
                AutoarchiveReloaded.log.info("ignore account '" + account.name + "'");
            }
        }
        getFoldersToArchive(folders) {
            try {
                const foldersToArchive = [];
                for (const folder of folders) {
                    AutoarchiveReloaded.log.info("Check folder " + folder.name + " (" + folder.type + ")");
                    if (this.folderShallBeIgnored(folder, folders)) {
                        AutoarchiveReloaded.log.info("ignore folder '" + folder.path + "' (" + folder.type + ")");
                    }
                    else {
                        foldersToArchive.push(folder);
                    }
                }
                return foldersToArchive;
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
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
            return (folderType === "trash") || (folderType === "junk") || (folderType === "outbox") || (folderType === "drafts") || (folderType === "templates") || (folderType === "archives");
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
                AutoarchiveReloaded.log.info("start searching messages to archive in folder '" + folder.path + "' (" + folder.type + ") in account '" + mailAccount.name + "'");
                const messages = await this.searchMessagesToArchive(folder, settings);
                AutoarchiveReloaded.log.info("message search done for '" + folder.name + "' in account '" + mailAccount.name + "' -> " + messages.length + " messages found to archive");
                if (messages.length > 0) {
                    AutoarchiveReloaded.log.info("start real archiving of '" + folder.name + "' (" + messages.length + " messages) in account '" + mailAccount.name + "'");
                    await this.archiveMessages(messages);
                }
            }
            catch (e) {
                AutoarchiveReloaded.log.errorException(e);
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
                AutoarchiveReloaded.log.errorException(e, "The exception might occur because the folder is a virtual folder... See https://bugzilla.mozilla.org/show_bug.cgi?id=1529791");
                return messages;
            }
            await this.detectMessagesToArchive(messageList, settings, messages);
            while (messageList.id) {
                messageList = await browser.messages.continueList(messageList.id);
                await this.detectMessagesToArchive(messageList, settings, messages);
            }
            return messages;
        }
        async detectMessagesToArchive(messageList, settings, messages) {
            for (const message of messageList.messages) {
                if (await this.shallMessageBeArchived(message, settings)) {
                    messages.push(message);
                }
            }
        }
        async shallMessageBeArchived(messageHeader, settings) {
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
            const tags = messageHeader.tags.filter((tag) => tag !== "junk");
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
                AutoarchiveReloaded.log.errorException(e);
            }
        }
    }
    AutoarchiveReloaded.Archiver = Archiver;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
/*!
Copyright 2019 Brummolix (AutoarchiveReloaded, https://github.com/Brummolix/AutoarchiveReloaded )

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
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    async function startup() {
        try {
            AutoarchiveReloaded.log.info("Autoarchive background script started");
            browser.autoarchive.initToolbarConfigurationObserver();
            browser.browserAction.onClicked.addListener(onArchiveManuallyClicked);
            const optionHelper = new AutoarchiveReloaded.OptionHelper();
            await optionHelper.initializePreferencesAtStartup();
            await AutoarchiveReloaded.MainFunctions.startupAndInitialzeAutomaticArchiving();
        }
        catch (e) {
            AutoarchiveReloaded.log.errorException(e);
            throw e;
        }
    }
    AutoarchiveReloaded.startup = startup;
    async function onArchiveManuallyClicked() {
        if (await browser.autoarchive.isToolbarConfigurationOpen()) {
            AutoarchiveReloaded.log.info("archive manually rejected because of toolbar customization");
            return;
        }
        await AutoarchiveReloaded.MainFunctions.onArchiveManually();
    }
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
AutoarchiveReloaded.startup();
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    let GlobalStates;
    (function (GlobalStates) {
        GlobalStates[GlobalStates["UNINITIALZED"] = 0] = "UNINITIALZED";
        GlobalStates[GlobalStates["READY_FOR_WORK"] = 1] = "READY_FOR_WORK";
        GlobalStates[GlobalStates["IN_PROGRESS"] = 2] = "IN_PROGRESS";
    })(GlobalStates || (GlobalStates = {}));
    class MainFunctions {
        static async startupAndInitialzeAutomaticArchiving() {
            AutoarchiveReloaded.log.info("start...");
            const appInfoLogger = new AutoarchiveReloaded.AppInfoLogger();
            await appInfoLogger.log();
            this.status = GlobalStates.READY_FOR_WORK;
            AutoarchiveReloaded.log.info("ready for work");
            const optionHelper = new AutoarchiveReloaded.OptionHelper();
            const settings = await optionHelper.loadCurrentSettings();
            if (settings.globalSettings.archiveType === "startup") {
                AutoarchiveReloaded.log.info("archive type at startup");
                setTimeout(this.onDoArchiveAutomatic.bind(this), 9000);
                setInterval(this.onDoArchiveAutomatic.bind(this), 86400000);
            }
            else {
                AutoarchiveReloaded.log.info("archive type manually");
            }
        }
        static async onArchiveManually() {
            AutoarchiveReloaded.log.info("try manual archive");
            if (this.status === GlobalStates.UNINITIALZED) {
                AutoarchiveReloaded.log.info("not initialized, cancel");
                await browser.autoarchive.alert(browser.i18n.getMessage("dialogTitle"), browser.i18n.getMessage("waitForInit"));
                return;
            }
            if (await browser.autoarchive.confirm(browser.i18n.getMessage("dialogTitle"), browser.i18n.getMessage("dialogStartManualText"))) {
                if (this.status === GlobalStates.IN_PROGRESS) {
                    AutoarchiveReloaded.log.info("busy with other archive..., cancel");
                    await browser.autoarchive.alert(browser.i18n.getMessage("dialogTitle"), browser.i18n.getMessage("waitForArchive"));
                    return;
                }
                await this.onDoArchive();
            }
            else {
                AutoarchiveReloaded.log.info("manual archive canceled by user");
            }
        }
        static async onDoArchiveAutomatic() {
            AutoarchiveReloaded.log.info("try automatic archive");
            if (this.status !== GlobalStates.READY_FOR_WORK) {
                AutoarchiveReloaded.log.info("automatic archive busy, wait");
                setTimeout(this.onDoArchiveAutomatic.bind(this), 5000);
            }
            else {
                await this.onDoArchive();
            }
        }
        static async onDoArchive() {
            AutoarchiveReloaded.log.info("start archiving");
            this.status = GlobalStates.IN_PROGRESS;
            const autoarchiveReloaded = new AutoarchiveReloaded.Archiver();
            await autoarchiveReloaded.archiveAccounts();
            AutoarchiveReloaded.log.info("archive (searching messages to archive) done");
            this.status = GlobalStates.READY_FOR_WORK;
        }
    }
    MainFunctions.status = GlobalStates.UNINITIALZED;
    AutoarchiveReloaded.MainFunctions = MainFunctions;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
var AutoarchiveReloaded;
(function (AutoarchiveReloaded) {
    class SettingsHelper {
        static isArchivingSomething(accountSettings) {
            return (accountSettings.bArchiveOther || accountSettings.bArchiveMarked || accountSettings.bArchiveTagged || accountSettings.bArchiveUnread);
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
            AutoarchiveReloaded.log.info("Settings for '" + accountName + "':");
            AutoarchiveReloaded.log.info(JSON.stringify(accountSettings));
        }
    }
    AutoarchiveReloaded.SettingsHelper = SettingsHelper;
})(AutoarchiveReloaded || (AutoarchiveReloaded = {}));
