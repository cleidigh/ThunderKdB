'use strict';

if (!mailmindr) var mailmindr = {};
if (!mailmindr.dialogs) mailmindr.dialogs = {};

Components.utils.import('chrome://mailmindr/content/utils/core.jsm');
Components.utils.import('chrome://mailmindr/content/utils/common.jsm');
Components.utils.import('chrome://mailmindr/content/utils/logger.jsm');
Components.utils.import('chrome://mailmindr/content/utils/factory.jsm');

mailmindr.dialogs.actioneditor = {
    _logger: null,
    _name: 'mailmindr.dialogs.actionEditor',
    _initialized: false,
    _callback: null,
    _elements: {},
    _options: {},

    /**
     * onLoad - triggered when editor is loaded
     * @returns Returns always true
     */
    onLoad: function() {
        this.Initialize();
        //return true;
    },

    /**
     * onDialogCancel triggered when the user cancels or closes the dialog
     * @returns result is always true;
     */
    onDialogCancel: function() {
        if (this._callback) {
            this._callback(null); // null >> no action object should be stored or created
        }
        return true;
    },

    /**
     * initialize dialog - set tags, combobox entries, etc
     */
    Initialize: function() {
        let options;

        if (!this._initialized) {
            options = window.arguments[0];
            this._callback = options.callback;

            this._elements.tags = document.getElementById('mailmindrTags');
            this._elements.folders = document.getElementById(
                'mailmindrTargetFolder'
            );
            this._elements.editorFields = document.getElementById(
                'mailmindrActionEditorEditfields'
            );
            this._elements.checkTagAction = document.getElementById(
                'mailmindrCheckTagAction'
            );
            this._elements.checkFolderAction = document.getElementById(
                'mailmindrCheckFolderAction'
            );
            this._elements.checkDoShowDialog = document.getElementById(
                'mailmindrCheckDoShowDialog'
            );
            this._elements.checkDoMarkAsUnread = document.getElementById(
                'mailmindrCheckDoMarkAsUnread'
            );
            this._elements.checkDoMarkFlag = document.getElementById(
                'mailmindrCheckDoMarkFlag'
            );
            this._elements.radioDoMove = document.getElementById(
                'mailmindrDoMove'
            );
            this._elements.radioDoCopy = document.getElementById(
                'mailmindrDoCopy'
            );

            this._elements.editorFields.setAttribute(
                'hidden',
                !options.standalone ? 'false' : 'true'
            );

            mailmindrCommon.fillTags(this._elements.tags, 0);
            mailmindrCommon.listAllFolders(this._elements.folders, null, 0);

            this.setEventListeners();

            this._logger = new mailmindrLogger(this);
            this._options = options;
            this._initialized = true;
        }
    },

    setEventListeners: function() {
        let scope = this;

        /* add event listeners to checkboxes and radios */
        if (this._elements.checkTagAction) {
            this._elements.checkTagAction.addEventListener(
                'CheckboxStateChange',
                function(e) {
                    scope.onTriggerChange('mailmindrCheckTagAction');
                }
            );
        }

        if (this._elements.checkFolderAction) {
            this._elements.checkFolderAction.addEventListener(
                'CheckboxStateChange',
                function(e) {
                    scope.onTriggerChange('mailmindrCheckFolderAction');
                }
            );
        }
    },

    /**
     * triggered when a checkbox has changed
     */
    onTriggerChange: function(eventSource) {
        let eventSourceElement = document.getElementById(eventSource);
        let value = true;
        let target = null;
        switch (eventSource) {
            case 'mailmindrCheckTagAction':
                /* the dropdown box */
                target = this._elements.tags;
                value = true; // if not checked: no attribute is present
                if (eventSourceElement.hasAttribute('checked')) {
                    value = !eventSourceElement.getAttribute('checked');
                }
                target.setAttribute('disabled', value);
                break;
            case 'mailmindrCheckFolderAction':
                value = true; // if not checked: no attribute is present
                if (eventSourceElement.hasAttribute('checked')) {
                    value = !eventSourceElement.getAttribute('checked');
                }

                /* the dropbox' label */
                target = document.getElementById('mailmindrTargetFolderLabel');
                target.setAttribute('disabled', value);

                /* the drop down box */
                target = document.getElementById('mailmindrTargetFolder');
                target.setAttribute('disabled', value);

                /* the two radios */
                target = document.getElementById('mailmindrDoMove');
                target.setAttribute('disabled', value);

                target = document.getElementById('mailmindrDoCopy');
                target.setAttribute('disabled', value);
                break;
        }
    },

    /**
     * set action to the edit controls
     */
    setAction: function(action) {
        var target = null;

        /* set name */
        target = document.getElementById('');
    },

    /**
     * get action object from the values of the controls in dialog
     */
    getAction: function() {
        let action = mailmindrFactory.createActionTemplate();

        action.doTagWith = this._elements.checkTagAction.getAttribute('checked')
            ? this._elements.tags.value
            : false;
        action.targetFolder = this._elements.checkFolderAction.getAttribute(
            'checked'
        )
            ? this._elements.folders.value
            : '';
        action.doMoveOrCopy = this._elements.checkFolderAction.getAttribute(
            'checked'
        )
            ? this._elements.radioDoMove.getAttribute('selected')
                ? 1
                : this._elements.radioDoCopy.getAttribute('selected')
                ? 2
                : 0
            : 0;
        action.doShowDialog = this._elements.checkDoShowDialog.getAttribute(
            'checked'
        )
            ? true
            : false;
        action.doMarkAsUnread = this._elements.checkDoMarkAsUnread.getAttribute(
            'checked'
        )
            ? true
            : false;
        action.doMarkFlag = this._elements.checkDoMarkFlag.getAttribute(
            'checked'
        )
            ? true
            : false;

        return action;
    },

    /**
     * onDialogAccept
     * @returns Returns always true
     * */
    onDialogAccept: function() {
        let result = {
            action: this.getAction(),
            timespan: this._options.standalone ? this.getTimespan() : false,
            selected: this._options.selected
        };

        this._callback(result);

        return true;
    }
};

window.addEventListener(
    'load',
    function() {
        // 
        mailmindr.dialogs.actioneditor.onLoad();
    },
    false
);
