
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var passwordManager= Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

var prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("");


let MY_EXTENSION_BASE_PREF_NAME = "extensions.signalspam.";

function prefType(name) {
    switch (name) {
        case "bool_pref": {
            return "bool";
        }
        case "integer_pref": {
            return "int";
        }
        case "ascii_string_pref": {
            return "char";
        }
        case "unicode_string_pref": {
            return "string";
        }
    }
    throw new Error(`Unexpected pref type ${name}`);
}


var legacyprefs = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            legacyprefs: {
                async getPassword(userid,hostname) {
                    void 0
                    try {
                        let password = null;
                        let logins = passwordManager.findLogins(hostname, 'User SignIn', null);
                        for (let login of logins) {
                            if (login.username === userid) {
                                password = login.password;
                                break;
                            }
                        }
                        void 0;
                        return password;
                    } catch(e) {
                        void 0;
                        return undefined;
                    }
                },
                async getPref(name, type, base) {
                    try {
                        if (base)
                            MY_EXTENSION_BASE_PREF_NAME = base;
                        if (/\.$/.test(base))
                            base+=".";
                        void 0;
                        switch (type) {
                            case "boolean":
                            case "bool": {
                                let value=prefs.getBoolPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
                                void 0;
                                return value;
                            }
                            case "int": {
                                let value=prefs.getIntPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
                                void 0;
                                return value;
                            }
                            case "char": {
                                let value=prefs.getCharPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
                                void 0;
                                return value;
                            }
                            case "string": {
                                let value=prefs.getCharPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
                                void 0;
                                return value;
                            }
                            default: {
                                void 0;
                                return undefined;
                            }
                        }
                    } catch (ex) {
                        void 0;
                        return undefined;
                    }
                },

            },
        };
    }
};