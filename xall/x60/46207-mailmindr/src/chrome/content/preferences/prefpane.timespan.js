"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://mailmindr/localisation.jsm");

var mailmindrPrefPaneTimespan = {
    _initialized: false,
    _name: 'prefPane.Timespan',
    _targetListName: 'mailmindrPrefPaneTimespanList',
    _logger: null,
    _listElement: null,
    _data: [],

    initialize: function() {
        this._logger = new mailmindrLogger(this);
        try {
            this._logger.log('initialize : prefpane.timespan.js');
            this._listElement = document.getElementById('mailmindrTimespanList');

            this.refresh();

            this._initialized = true;
        } catch (initException) {
            this._logger.error(initException);
        }
    },

    addTimespan: function() {
        this.openTimespanDialog(null);
    },

    get SelectedTimespan() {
        let idx = this._listElement.selectedIndex;
        if (idx < 0) {
            return null;
        }

        let tsid = this._listElement.value;
        return mailmindrKernel.kernel.modules.storage.loadTimespan(tsid);
    },

    editTimespan: function() {
        let timespan = this.SelectedTimespan;
        if (timespan != null) {
            this.openTimespanDialog(timespan);
        }


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

        // 
        // 
        // 
        // 
        // 
    },

    openTimespanDialog: function(tsElement) {
        var data = tsElement == null ? {} : tsElement;
        document.documentElement.openSubDialog(
            "chrome://mailmindr/content/dialogs/timespaneditor.xul",
            "", data);

        if (data.out && data.out.result != null) {
            this._logger.log('>> REFRESH');
            mailmindrPrefPaneCommon.doRefreshAll();
        }

        return data.out;
    },

    deleteTimespan: function() {
        var timespan = this.SelectedTimespan;
        if (timespan == null) {
            return;
        }

        let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);

        let title = mailmindrI18n.getString("mailmindr.prefpane.timespan.delete.title");
        let text = mailmindrI18n.getString("mailmindr.prefpane.timespan.delete.text");

        if (promptService.confirm(null, title, text)) {
            mailmindrKernel.kernel.modules.storage.deleteTimespan(timespan);
            this.refresh();
        }
    },

    refresh : function() {
        this.loadTimespans();
        this._logger.log('[SUCCESS] refresh of prefpane.common');
    },

    loadTimespans: function() {
        try {
            let index = this._listElement.selectedIndex;
            mailmindrCommon.clearChildren(this._listElement);

            this._data = mailmindrKernel.kernel.modules.storage.loadTimespans();

            for (let item of this._data) {
                let element = document.createElement('listitem');
                element.setAttribute('label', item.text);
                element.setAttribute('value', item.id);
                this._listElement.appendChild(element);
            }
            this._listElement.selectedIndex = index;
        } catch (loadException) {
            this._logger.error(loadException);
        }
    }
}
