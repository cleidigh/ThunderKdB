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
async function saveOptions() {
    try {
        const settings = {
            globalSettings: {
                archiveType: $("[name=archiveType]:checked").val(),
                enableInfoLogging: document.getElementById("enableInfoLogging").checked,
            },
            accountSettings: {},
        };
        $("#tabcontent").children().each((index, element) => {
            const accountId = $(element).data("accountId");
            if (accountId) {
                settings.accountSettings[accountId] = {
                    bArchiveUnread: getElementForAccount(accountId, "archiveUnread").checked,
                    daysUnread: Number(getElementForAccount(accountId, "archiveUnreadDays").value),
                    bArchiveMarked: getElementForAccount(accountId, "archiveStarred").checked,
                    daysMarked: Number(getElementForAccount(accountId, "archiveStarredDays").value),
                    bArchiveTagged: getElementForAccount(accountId, "archiveTagged").checked,
                    daysTagged: Number(getElementForAccount(accountId, "archiveTaggedDays").value),
                    bArchiveOther: getElementForAccount(accountId, "archiveMessages").checked,
                    daysOther: Number(getElementForAccount(accountId, "archiveMessagesDays").value),
                };
            }
        });
        await optionHelper.savePreferencesAndPublishForLogging(settings);
        $.notify({
            message: "__MSG_settingsSaved__",
        }, {
            type: "success",
            allow_dismiss: false,
            placement: {
                from: "top",
                align: "center",
            },
            animate: {
                enter: "animated bounceInDown",
                exit: "animated bounceOutUp",
            },
        });
        l10n.updateDocument();
    }
    catch (e) {
        AutoarchiveReloaded.log.errorException(e);
        throw e;
    }
}
async function restoreOptions() {
    const settings = await optionHelper.loadCurrentSettings();
    document.getElementById("enableInfoLogging").checked = settings.globalSettings.enableInfoLogging;
    document.querySelectorAll('input[name="archiveType"]').forEach((element) => {
        element.checked = (element.value === settings.globalSettings.archiveType);
    });
    const accounts = await AutoarchiveReloaded.AccountInfo.askForAccounts();
    const accountsSorted = [];
    for (const accountId in settings.accountSettings) {
        if (settings.accountSettings.hasOwnProperty(accountId)) {
            accountsSorted.push({
                account: AutoarchiveReloaded.AccountInfo.findAccountInfo(accounts, accountId),
                accountSetting: settings.accountSettings[accountId],
            });
        }
    }
    accountsSorted.sort((a, b) => {
        if (a.account.order === b.account.order) {
            return 0;
        }
        if (a.account.order < b.account.order) {
            return -1;
        }
        return 1;
    });
    accountsSorted.forEach((accountInfos) => {
        const account = accountInfos.account;
        const accountId = accountInfos.account.accountId;
        const accountSetting = accountInfos.accountSetting;
        cloneTemplate("§§ID§§-tab", "tablist", account);
        cloneTemplate("accountContent-§§ID§§", "tabcontent", account);
        getJQueryElementForAccount(accountId, "accountContent").data("accountId", accountId);
        getElementForAccount(accountId, "archiveUnread").checked = accountSetting.bArchiveUnread;
        getElementForAccount(accountId, "archiveUnreadDays").value = accountSetting.daysUnread.toString();
        getElementForAccount(accountId, "archiveStarred").checked = accountSetting.bArchiveMarked;
        getElementForAccount(accountId, "archiveStarredDays").value = accountSetting.daysMarked.toString();
        getElementForAccount(accountId, "archiveTagged").checked = accountSetting.bArchiveTagged;
        getElementForAccount(accountId, "archiveTaggedDays").value = accountSetting.daysTagged.toString();
        getElementForAccount(accountId, "archiveMessages").checked = accountSetting.bArchiveOther;
        getElementForAccount(accountId, "archiveMessagesDays").value = accountSetting.daysOther.toString();
    });
}
function getJQueryElementForAccount(accountId, elementId) {
    const id = elementId + "-" + accountId;
    const jQueryElem = $("#" + id);
    return jQueryElem;
}
function getElementForAccount(accountId, elementId) {
    return getJQueryElementForAccount(accountId, elementId)[0];
}
function cloneTemplate(cloneId, appendToId, accountInfo) {
    const clone = $("#" + cloneId).clone(true, true);
    clone.appendTo("#" + appendToId);
    clone.removeClass("d-none");
    let html = clone[0].outerHTML;
    html = html.replace(/§§ID§§/g, accountInfo.accountId);
    html = html.replace(/§§TITLE§§/g, accountInfo.accountName);
    clone[0].outerHTML = html;
}
async function onLoad() {
    try {
        await restoreOptions();
        $("#button").click(saveOptions);
    }
    catch (e) {
        AutoarchiveReloaded.log.errorException(e);
        throw e;
    }
}
let optionHelper = new AutoarchiveReloaded.OptionHelper();
$(onLoad);
