"use strict";
/*
let EXPORTED_SYMBOLS = ["mailmindrListHelper"];
*/
if (!mailmindr) var mailmindr = {};
if (!mailmindr.controls) mailmindr.controls = {};

Components.utils.import("chrome://mailmindr/content/utils/logger.jsm");

mailmindr.controls.list = function mailmindrListHelper(document, elementId) {
    this._initialized = false;
    this._document = document;
    this._name = 'controls.list';
    this._logger = new mailmindrLogger(this);

    this.initialize(elementId);
}

mailmindr.controls.list.prototype = {
    _list: null,
    _listChildren: null,
    _data: [],
    _mapping: new Array(),

    CurrentIndex: function() {
        return this._list.currentIndex;
    },

    initialize: function(listElementId) {
        this._elementId = listElementId;
        this._list = this._document.getElementById(listElementId);
        this._listChildren = this._document.getElementById(listElementId + 'TreeChildren');
        this._logger = new mailmindrLogger(this);
        this._data = [];
        this._initialized = true;
    },

    /**
     * SetColumMapping
     * set mapping to define how an object is mapped to the columns
     * columnMap: array of object keys in the order of the columns
     *
     * Example:
     *  [ "key", "key2", "key3" ] maps the keys key1, key2, key3 to
     *  the columns 0, 1, 2
     */
    setColumnMapping: function(columnMap) {
        this._mapping = columnMap;
    },

    appendElement: function(data) {
        var item = this._document.createElement('treeitem');
        var row = this._document.createElement('treerow');
        var itemCells = new Array();

        if (this._mapping.length == 0) {
            /* use default mapping */
            for (var key in data) {
                let cell = this._createTreeCellElement(data[key], null, 'label');
                row.appendChild(cell);
            }
        } else {
            /* map order given by this._mapping-Array */
            for (var idx = 0; idx < this._mapping.length; idx++) {
                let map = this._mapping[idx];
                let mapField = map;
                let mapAttribute = "label";

                if (typeof map == "object") {
                    mapField = map.Field;
                    mapAttribute = map.Attribute;
                }

                let cell = this._createTreeCellElement(data[mapField], null, 'label');
                row.appendChild(cell);
            }
        }

        let listElement = this._getTreeChildrenElement();
        if (listElement) {
            item.appendChild(row);
            listElement.appendChild(item);
            this._data.push();
        }
    },

    clear: function() {
        let element = this._getTreeChildrenElement();
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }

        this._data = [];
    },

    _getTreeChildrenElement: function() {
        return this._listChildren;
        /*
		let listChildren = this._document.getElementsByTagName('treechildren');
		
		if (listChildren)
		{
			return listChildren[0];
		}
		return null;
		*/
    },

    _createTreeCellElement: function(value, fieldName, attributeName) {
        let cell = this._document.createElement('treecell');
        cell.setAttribute(attributeName, value);

        return cell;
    }
};