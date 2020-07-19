'use strict';

if (!mailmindr) var mailmindr = {};
if (!mailmindr.controls) mailmindr.controls = {};

var { mailmindrCore } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/core.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrFactory } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/factory.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);

mailmindr.controls.ActionPicker = function ActionPicker(actionCombo, options) {
    this._name = 'controls.ActionPicker';
    this._logger = new mailmindrLogger(this);
    this._userAction = null;

    // 
    this._elements = {
        actions: actionCombo
    };

    this._events = {
        onSelectAction: []
    };

    this._actions = mailmindrCore.createSystemActions(
        options || {
            canBeUserDefined: false,
            canBeDeactivated: false
        }
    );

    mailmindrCommon.fillActionComboBox(this._elements.actions, this._actions);

    this.setEventListeners();

    this._elements.actions.selectedIndex = 0;
};

mailmindr.controls.ActionPicker.prototype = {
    setEventListeners: function() {
        var scope = this;
        this._elements.actions.addEventListener(
            'select',
            function() {
                scope.onSelectAction(scope);
            },
            false
        );
    },

    /**
     * addEventListener - adds the given trigger to the events trigger chain.
     * @returns bool True, if event can be pushed to trigger chain, false otherwise
     */
    addEventListener: function(event, trigger) {
        switch (event) {
            case 'selectAction':
                this._events.onSelectAction.push(trigger);
                return true;
                break;
        }

        return false;
    },

    onSelectAction: function(target) {
        this._logger.log('action selected!');

        let value = target._elements.actions.value;

        this._logger.log(
            `action selected: '${target._elements.actions.value}'`
        );

        if (value == -2) {
            let data = {
                standalone: true
            };

            window.openDialog(
                'chrome://mailmindr/content/dialogs/actioneditor.xul',
                'setAction',
                'chrome, resizeable=false, dependent=true, chrome=yes, centerscreen=yes, modal=true',
                data
            );
        }

        target.triggerOnSelectAction();
    },

    /**
     * triggerOnSelectAction - triggers all registered event handlers for
     * event 'selectAction'
     */
    triggerOnSelectAction: function() {
        let action = this.Action;

        for (let trigger of this._events.onSelectAction) {
            trigger(action);
        }
    },

    /**
     * _getActionFromList - returns an action from the actionlist
     * @returns action object if id was found, null otherwise
     */
    _getActionFromList: function(action) {
        let actionId = action.id;

        if (actionId == '-1') {
            return null;
        }

        if (actionId == '-2') {
            // 
            return this._userAction;
        }

        for (let action of this._actions) {
            if (action.id == actionId) {
                return action;
            }
        }

        return null;
    },

    _isEqual: function(action, target) {
        function normalize(a) {
            return typeof a == typeof false ? (a ? 1 : 0) : a;
        }

        function eq(a, b) {
            return normalize(a) == normalize(b);
        }

        if (typeof target == 'undefined' || target == null) {
            this._logger.log('isEqual: other action is undefined or null');
            return false;
        }

        // 
        const skipped = [
            'id',
            'doShowDialog',
            'text',
            'isGenerated',
            'copyTo',
            'description',
            'enabled',
            'isValid'
        ];
        let equal = true;

        for (let prop in action) {
            const propertyStartsWithUnderscore = prop.substring(0, 1) === '_';
            if (
                propertyStartsWithUnderscore ||
                skipped.indexOf(prop) >= 0 ||
                typeof action[prop] === 'function'
            ) {
                continue;
            }

            //-- this._logger.log('=> ' + p + ' ("' + action[p] + '" == "' + target[p] + '")');
            // 
            equal = equal && eq(action[prop], target[prop]);
        }

        // 
        return equal;
    },

    get Action() {
        let actionJson = this._elements.actions.value;
        if (actionJson === '') {
            return null;
        }

        let action = JSON.parse(actionJson);
        return this._getActionFromList(action);
    },

    set Action(action) {
        let scope = this;
        let comparer = function(comp) {
            return scope._isEqual(comp, action);
        };

        // 
        this._logger.log('__SEARCH ACTION__');
        this._logger.log(`Searching for action ${action}`);

        const selected = this._actions.filter(comparer, action);

        if (selected.length > 0) {
            this._logger.log(
                `selectable actions in picker: ${selected.length}`
            );
            this._elements.actions.value = selected[0].toJson();
            if (this._elements.actions.selectedIndex < 0) {
                this._elements.actions.selectedIndex = 0;
            }
            this._elements.actions.setAttribute('disabled', 'false');
        }

        this._logger.log('>>> ' + selected);
        this._logger.log('__DONE__');
    },

    set Enabled(enabled) {
        this._elements.actions.setAttribute('disabled', enabled);
    },

    get Enabled() {
        this._logger.log(
            'hasAttribue:  ' + this._elements.actions.hasAttribute('disabled')
        );
        this._logger.log(
            'getAttribute: ' + this._elements.actions.getAttribute('disabled')
        );

        return (
            this._elements.actions.hasAttribute('disabled') &&
            this._elements.actions.getAttribute('disabled') == 'false'
        );
    }
};
