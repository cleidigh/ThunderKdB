/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 8:
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

/***/ 2:
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

/***/ 1:
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


/***/ })

/******/ 	});
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
const GlobalStates_1 = __webpack_require__(8);
const LoggerWebextension_1 = __webpack_require__(1);
async function initialize() {
    const message = { message: "getArchiveStatus" };
    const response = await browser.runtime.sendMessage(message);
    const status = response.status;
    switch (status) {
        case GlobalStates_1.GlobalStates.uninitialized: {
            LoggerWebextension_1.log.info("not initialized, cancel");
            $("#text").text(browser.i18n.getMessage("waitForInit"));
            $("#button").hide();
            break;
        }
        case GlobalStates_1.GlobalStates.inProgress: {
            LoggerWebextension_1.log.info("busy with other archive..., cancel");
            $("#text").text(browser.i18n.getMessage("waitForArchive"));
            $("#button").hide();
            break;
        }
        case GlobalStates_1.GlobalStates.readyForWork: {
            LoggerWebextension_1.log.info("user can start archiving");
            $("#text").text(browser.i18n.getMessage("dialogStartManualText"));
            $("#button").show();
            break;
        }
    }
}
async function onManualArchive() {
    const message = { message: "archiveManually" };
    await browser.runtime.sendMessage(message);
    window.close();
}
async function onLoad() {
    try {
        await initialize();
        $("#button").click(onManualArchive);
    }
    catch (e) {
        LoggerWebextension_1.log.errorException(e);
        throw e;
    }
}
$(onLoad);

})();

/******/ })()
;