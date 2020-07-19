var { MailmindrStringUtils } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/stringUtils.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);

var EXPORTED_SYMBOLS = ['MailmindrListView'];

var MailmindrListView =
    MailmindrListView ||
    class MailmindrListView {
        constructor(aName) {
            this.treeBox = null;
            this.selection = null;
            this.data = new Array();
            this._name = 'list (' + (aName || 'default') + ')';
            this._logger = new mailmindrLogger(this);
        }

        _getMindrAt(idx) {
            if (idx >= this.data.length) {
                return null;
            }
            let mindr = this.data[idx];
            return mindr;
        }

        setTree(treeBox) {
            this.treeBox = treeBox;
        }

        getCellText(idx, column) {
            let mindr = this._getMindrAt(idx);
            let details = mindr.details;

            if (column.id == 'mailmindrPendingListColSubject') {
                return details.subject;
            }

            if (column.id == 'mailmindrPendingListColFrom') {
                if (mindr.waitForReply == 1) {
                    return details.recipients;
                }

                return details.author;
            }

            if (column.id == 'mailmindrPendingListColRemainingTime') {
                return MailmindrStringUtils.toRelativeString(mindr.remindat);
            }

            return '';
        }

        isContainer(idx) {
            return false;
        }

        isContainerOpen(idx) {
            return false;
        }

        isContainerEmpty(idx) {
            return false;
        }

        isSeparator(idx) {
            return false;
        }

        isSorted() {
            return false;
        }

        isEditable(idx, column) {
            return false;
        }

        getParentIndex(idx) {
            if (this.isContainer(idx)) return -1;
            for (var t = idx - 1; t >= 0; t--) {
                if (this.isContainer(t)) {
                    return t;
                }
            }
        }

        getLevel(idx) {
            if (this.isContainer(idx)) {
                return 0;
            }
            return 1;
        }

        hasNextSibling(idx, after) {
            var thisLevel = this.getLevel(idx);
            for (var t = after + 1; t < this.data.length; t++) {
                var nextLevel = this.getLevel(t);

                if (nextLevel == thisLevel) {
                    return true;
                }

                if (nextLevel < thisLevel) {
                    break;
                }
            }
            return false;
        }

        toggleOpenState(idx) {}

        getImageSrc(idx, column) {}

        getProgressMode(idx, column) {}

        getCellValue(idx, column) {
            if (null == column && this.data.length > 0) {
                let result = this.data[idx].mailmindrGuid;
                return result;
            }

            if (-1 == column && this.data.length > 0) {
                let result = this.data[idx];
                return result;
            }
        }

        cycleHeader(col, elem) {}

        selectionChanged() {}

        cycleCell(idx, column) {}

        performAction(action) {}

        performActionOnCell(action, index, column) {}

        getRowProperties(idx) {}

        getCellProperties(idx, column) {
            let props = [];
            let mindr = this._getMindrAt(idx);

            if (mindr) {
                if (mindr.waitForReply == 1 && mindr.isReplyAvailable) {
                    props.push('reply-available');
                }

                if (mindr.remindat < Date.now()) {
                    props.push('overdue');
                }
            }

            return props.join(' ').trim();
        }

        getColumnProperties(column) {}

        selectMindrByGuid(mindrGuid) {
            if (null == mindrGuid || mindrGuid == '') {
                return;
            }

            this.selection.clearSelection();

            for (let idx in this.data) {
                if (this.data[idx].mailmindrGuid == mindrGuid) {
                    this.selection.select(idx);
                }
            }
        }

        getSelectedMindrGuid() {
            let idx = this.selection && this.selection.currentIndex;
            if (idx >= 0) {
                return this.getCellValue(idx, null);
            }

            return null;
        }

        findSelectedMindr() {
            let idx = this.selection.currentIndex;
            if (idx < 0) {
                return null;
            }

            return this.getCellValue(idx, -1);
        }

        get rowCount() {
            return this.data.length;
        }

        appendData(item) {
            this.data.push(item);
        }

        remove(item) {
            let idx = this.data.indexOf(item);
            if (idx >= 0) {
                this.data.splice(idx, 1);
                this.treeBox.rowCountChanged(idx + 1, -1);
                this.treeBox.invalidateRow(idx);
                this.treeBox.invalidate();
            }
        }

        hasData() {
            return this.data.length > 0;
        }

        getItemAt(idx) {
            if (idx >= 0 && idx < this.data.length) {
                return this.data[idx];
            }

            return;
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

        updateItems(mindrs) {
            let added = [];
            let unchanged = [];

            // 

            // 
            mindrs.forEach(mindr => {
                if (
                    this.data.find(
                        item => mindr.mailmindrGuid === item.mailmindrGuid
                    ) === undefined
                ) {
                    added.push(mindr);
                } else {
                    unchanged.push(mindr);
                }
            });

            // 
            // 
            // 
            // 
            // 
            // 
            // 
            // 

            let deleted = this.data.filter(function(mindr) {
                return !Boolean(
                    unchanged.find(
                        item => item.mailmindrGuid === mindr.mailmindrGuid
                    )
                );
            });

            // 
            // 
            // 
            // 
            // 
            (deleted || []).forEach(item => this.remove(item));

            // 
            // 
            // 
            // 
            // 
            (added || []).forEach(item => this.appendData(item));

            this._logger.log(
                `status: unchaned: ${unchanged.length}, added: ${added.length}, deleted: ${deleted.length}`
            );
        }

        clear() {
            // 
            // 
            // 
            // 
            // 
            // 
            // 
            // 
        }

        /// sort column index by direction: 1 = ascending, -1 descending
        sortByColumn(aColumnName, aDirection) {
            var self = this;
            var normalize = o => (typeof o == 'string' ? o.toLowerCase() : o);
            var getValue = function(obj, aColumnName) {
                switch (aColumnName) {
                    case 'mailmindrPendingListColSubject':
                        return normalize(obj.details.subject);
                    case 'mailmindrPendingListColFrom':
                        if (obj.waitForReply == 1) {
                            return normalize(obj.details.recipients);
                        }

                        return normalize(obj.details.author);
                    case 'mailmindrPendingListColRemainingTime':
                        return normalize(obj.remindat);
                }
                return '';
            };

            var sortFunction = (a, b) => {
                if (getValue(a, aColumnName) < getValue(b, aColumnName)) {
                    return 1 * aDirection;
                }
                if (getValue(a, aColumnName) > getValue(b, aColumnName)) {
                    return -1 * aDirection;
                }
                return 0;
            };

            this.data.sort(sortFunction);
        }
    };
