"use strict";

Components.utils.import("resource://gre/modules/PromiseUtils.jsm");
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
// 
Components.utils.import("resource://mailmindr/kernel.jsm")
Components.utils.import("resource://mailmindr/preferences.jsm")

const MAILMINDR_PREFPANES = [mailmindrPrefPaneCommon, mailmindrPrefPaneInboxZero, mailmindrPrefPaneTimespan];

var gRDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);

var mailmindrPreferencesDialog = {
    _name: "mailmindrPreferencesDialog",
    _logger: null,
    _initialized: false,
    _elements: {},
    dataMapping: null,

    initialize() {
        this._logger = new mailmindrLogger(this);

        try {
            // 

            // 
            // 

            // 

            // 
            // 

            this._logger.log('-------------------------- RFS');
                // 
                    /* now initialize all panes */
                for (let pane of MAILMINDR_PREFPANES) {
                    pane.initialize();

                    // 
                    // 
                    // 
                }

                // 
            // 

            this._logger.log('----> RFS OK')

            this.loadPreferences();
            // 
            // 
            // 
            // 

            // 
            // 
            // 
            // 

            // 
            // 
        } catch (exception) {
            this._logger.error('messup on preferences detected');
            this._logger.error(exception);
        }
        this._initialized = true;
    },

    onLoad() {
        getMailmindrStorage().then(() => mailmindrPreferencesDialog.initialize());
    },

    doRefreshAll: function() {
        for (let pane of MAILMINDR_PREFPANES) {
            pane.refresh();
        }
    },

    refresh() {
        this.doRefreshAll();
    },

    onAccept() {
        try {
            this._logger.log('ACCEPT');

            // 

            // 
            // 
            // 

            //if (prefs && prefs.getBoolPref("instantApply") == true) {

                let panes = document.getElementsByTagName("prefpane");
                for (let pane of panes) {
                    if (pane instanceof Components.interfaces.nsIDOMXULElement) {
                        pane.writePreferences(true);
                    }
                }
                
            //}

            for (let pane of MAILMINDR_PREFPANES) {
                this._logger.log('save panel: ' + typeof pane.savePreferences);
                if (typeof pane.savePreferences == 'function') {
                    pane.savePreferences();
                }
            }

            MailmindrPreferences.refresh();

            window.close();
        } catch (e) {
            this._logger.error("preferences can't be saved: " + e);
        }

        return true;
    },

    loadPreferences: function() {
        this._logger.log('Reading preference mapping');
        const prefMappingUrl = "resource://mailmindr/defaults/preferences/prefstorage.json";
        fetch(prefMappingUrl)
            .then(response => response.json())
            .then(data => {
                this.transformMapping(data);
                const mapping = data && data.mapping;
                if (!mapping) {
                    this._logger.error(`Preferences settings cannot be oaded from database.`);
                    return;
                }

                mapping.forEach(mappingElement => {
                    const { preference, name, type } = mappingElement;
                    const selector = `[data-preference="${preference}"]`;
                    const element = document.querySelector(selector);
                    // 
                    if (!element) {
                        return;
                    }

                    this._logger.log(`typing: ${type}`);
                    let value = MailmindrPreferences.getStringPref(name);
                    if (type === 'bool') {
                        this._logger.log('converting to bool');
                        value = Boolean(value);
                    }
                    if (type === 'number') {
                        value = MailmindrPreferences.getNumberPref(name);
                    }

                    this._logger.log(`> set value of ${name}`);
                    this.setValueToElement(element, value);
                });
            }).then(async () => {
                this._logger.log('-------------------------- LOAD');
                // 
                    /* now initialize all panes */
                    for (let pane of MAILMINDR_PREFPANES) {
                        // 
    
                        if (typeof pane.loadPreferences == 'function') {
                            await pane.loadPreferences();
                        }
                    }
    
                    // 
                // 
                this._logger.log('----> LOAD OK')
            }).catch((e) => {
                this._logger.error('nope/');
                this._logger.error(e);
            });
    },

    setValueToElement(element, value) {
        try {
            // 
            if (element.tagName && element.tagName === 'menulist') {
                // 
                // 
                this._logger.log(`set value to menulist: ${value}`);
                this.setMenuListValue(element, value);
            } else if (element.tagName && element.tagName === 'checkbox') {
                // 
                this._logger.log(`set value to checkbox: ${value}`);
                this.setCheckboxValue(element, value);
            } else {
                // 
                element.value = value;
            }
        } catch (e) {
            this._logger.error(e);
            // 
            element.selectedIndex = -1;
            this._logger.error(`nothing selected`);
        }
    },

    setMenuListValue: function(element, value) {
        let listContainsValue = false;
        this._logger.log(`.itemCount: ${element.itemCount} `);
        for (let idx = 0; idx < element.itemCount; idx++) {
            const item = element.getItemAtIndex(idx);
            const itemValue = item && item.value;
            if (itemValue === value) {
                listContainsValue = true;
                break;
            }
            this._logger.log(`..${itemValue}`);
        }

        if (listContainsValue) {
            this._logger.log(`[OK]        in list: ${value}`);
            // 
            element.value = value;
        }
        else {
            this._logger.log(`[NEG]       in list: ${value}`);
            // 
            element.selectedIndex = 0;
        }
    },

    setCheckboxValue: function(element, value) {
        // 
        const localValue = typeof value === 'string'
            ? value === 'true'
            : Boolean(value);
        this._logger.log(`checkbox::element ${element} to ${value} (w/ ${typeof value})`);
        if (!localValue) {
            this._logger.log('set checkbox value to false');
            if (element.hasAttribute('checked')) {
                this._logger.log(`remove attribute 'checked' from checkbox`);
                element.removeAttribute('checked');
            }
            this._logger.log(`setting checked to false`);
            element.checked = false;
            this._logger.log(`setting checked to false? ${element.checked}`);
        } else {
            this._logger.log('set checkbox value to true');
            element.setAttribute('checked', !!localValue);
        }
    },

    transformMapping: function(data) {
        if (data && data.mapping) {
            const map = {};
            data.mapping.forEach(item => {
                map[item.preference] = {
                    name: item.name,
                    type: item.type
                }
            });
            this.dataMapping = map;
        }
    }
};


