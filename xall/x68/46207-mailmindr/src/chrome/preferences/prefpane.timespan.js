'use strict';

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);

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
// 
// 

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
            this._listElement = document.getElementById(
                'mailmindrTimespanList'
            );

            this._listElement.addEventListener('select', e =>
                this.onSelectItem(e)
            );
            this.onSelectItem(null);

            this.refresh();

            // 

            this._initialized = true;
        } catch (initException) {
            this._logger.error(initException);
        }
    },

    get selectedTimespan() {
        const selectedIndex = this._listElement.currentIndex;
        if (selectedIndex < 0) {
            return null;
        }

        const item = this._listElement.view.getItemAtIndex(selectedIndex);
        const timespanId = (item && item.value) || -1;

        if (timespanId < 0) {
            return null;
        }

        const timespan = mailmindrKernel.kernel.modules.storage.loadTimespan(
            timespanId
        );

        return timespan;
    },

    addTimespan: function() {
        this.openTimespanDialog(null);
    },

    editTimespan: function() {
        const timespan = this.selectedTimespan;
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

    openTimespanDialog: function(selectedTimespan) {
        let data = selectedTimespan == null ? {} : selectedTimespan;
        data.onClose = () => this.refresh();

        // 
        // 
        // 

        window.openDialog(
            'chrome://mailmindr/content/dialogs/timespaneditor.xul',
            'chrome, dialog, modal, width=50',
            'mailmindrTimespanEditor',
            data
        );

        return data.out;
    },

    deleteTimespan: function() {
        var timespan = this.selectedTimespan;
        if (timespan == null) {
            return;
        }

        let promptService = Components.classes[
            '@mozilla.org/embedcomp/prompt-service;1'
        ].getService(Components.interfaces.nsIPromptService);

        let title = mailmindrI18n.getString(
            'mailmindr.prefpane.timespan.delete.title'
        );
        let text = mailmindrI18n.getString(
            'mailmindr.prefpane.timespan.delete.text'
        );

        if (promptService.confirm(null, title, text)) {
            mailmindrKernel.kernel.modules.storage.deleteTimespan(timespan);
            this.refresh();
        }
    },

    refresh: function() {
        this.loadTimespans();
        this.onSelectItem(null);
        this._logger.log('[SUCCESS] refresh of prefpane.common');
    },

    onSelectItem: function() {
        const editBtn = document.getElementById('mailmindrPrefBtnTimespanEdit');
        const deleteBtn = document.getElementById(
            'mailmindrPrefBtnTimespanDelete'
        );
        const itemSelected = this._listElement.currentIndex >= 0;

        editBtn.disabled = !itemSelected;
        deleteBtn.disabled = !itemSelected;
    },

    loadTimespans: function() {
        try {
            mailmindrCommon.clearChildren(this._listElement);

            const treecols = document.createElement('treecols');

            const columnLabelName = mailmindrI18n.getString(
                'mailmindr.prefpane.timespan.list.column.caption.name'
            );
            const columnLabelSource = mailmindrI18n.getString(
                'mailmindr.prefpane.timespan.list.column.caption.source'
            );
            const columnLabelVisible = mailmindrI18n.getString(
                'mailmindr.prefpane.timespan.list.column.caption.visible'
            );

            const itemSourceGenerated = mailmindrI18n.getString(
                'mailmindr.prefpane.timespan.list.item.generated'
            );
            const itemSourceUserDefined = mailmindrI18n.getString(
                'mailmindr.prefpane.timespan.list.item.user'
            );

            const columnVisible = document.createElement('treecol');
            columnVisible.id = 'mailmindrTimespanListColumnVisible';
            columnVisible.setAttribute('label', columnLabelVisible);
            columnVisible.setAttribute('type', 'checkbox');
            columnVisible.setAttribute('hidden', 'true');

            const columnName = document.createElement('treecol');
            columnName.id = 'mailmindrTimespanListColumnName';
            columnName.setAttribute('label', columnLabelName);
            columnName.setAttribute('flex', '1');

            const columnSource = document.createElement('treecol');
            columnSource.id = 'mailmindrTimespanListColumnSource';
            columnSource.setAttribute('label', columnLabelSource);
            columnSource.setAttribute('flex', '1');

            treecols.appendChild(columnVisible);
            treecols.appendChild(columnName);
            treecols.appendChild(columnSource);

            this._listElement.appendChild(treecols);

            const items = mailmindrKernel.kernel.modules.storage.loadTimespans();
            this._data = items;

            const itemContainer =
                document.getElementById('mailmindrTimespanListItems') ||
                document.createElement('treechildren');
            itemContainer.id = 'mailmindrTimespanListItems';

            items.map(item => {
                const itemElement = document.createElement('treeitem');
                const rowElement = document.createElement('treerow');
                const checkedCellElement = document.createElement('treecell');
                const textCellElement = document.createElement('treecell');
                const sourceCellElement = document.createElement('treecell');

                checkedCellElement.setAttribute('value', 'true');

                textCellElement.setAttribute('label', item.text);
                textCellElement.setAttribute('value', item.id);

                sourceCellElement.setAttribute(
                    'label',
                    item.isGenerated === 1
                        ? itemSourceGenerated
                        : itemSourceUserDefined
                );

                rowElement.appendChild(checkedCellElement);
                rowElement.appendChild(textCellElement);
                rowElement.appendChild(sourceCellElement);

                itemElement.value = item.id;
                itemElement.appendChild(rowElement);
                itemContainer.appendChild(itemElement);
            });

            this._listElement.appendChild(itemContainer);

            // 
        } catch (loadException) {
            this._logger.error(`loadTimespans failed`);
            this._logger.error(loadException);
        }
    }
};
