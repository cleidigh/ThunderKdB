/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global Components: false */
/* global TinyJsd: false */

'use strict';

const TYPE_USER = 0;
const TYPE_INTERNAL = 1;
const TYPE_CHILD = 2;

function watchListView() {
  this.rowCount = 0;
  this.visibleData = [];
  this.watchList = [];
}


watchListView.prototype = {

  appendWatch: function(wl) {
    this.watchList.push(wl);
    if (wl == "@global") {
      this.visibleData.push({
        watch: "Components.utils.getGlobalForObject(this)",
        label: TinyJsd.getString("watchList.globalVar"),
        value: undefined,
        level: 0,
        children: false,
        wlType: TYPE_INTERNAL
      });
    }
    else if (wl == "@this") {
      this.visibleData.push({
        watch: "this",
        label: "This",
        value: undefined,
        level: 0,
        children: false,
        wlType: TYPE_INTERNAL
      });
    }
    else {
      this.visibleData.push({
        watch: wl,
        label: wl,
        value: undefined,
        level: 0,
        children: false,
        wlType: TYPE_USER
      });
    }
    this.rowCount++;
    this.treebox.rowCountChanged(this.rowCount + 1, 1);
  },

  addGlobalObj: function() {
    this.appendWatch("@this");
    TinyJsd.DEBUG("glob: '" + TinyJsd.getString("watchList.globalVar") + "'");
    this.appendWatch("@global");
  },

  getWatchList: function() {
    return this.watchList;
  },

  getCellText: function(row, column) {
    if (row < this.visibleData.length) {
      if (column.id == "wl_variable_col") {
        return this.visibleData[row].label;
      }
      else {
        return this.visibleData[row].value;
      }
    }
    else
      return "";
  },

  updateAll: function() {
    for (let i in this.visibleData) {
      this.evaluateRow(i);
      this.treebox.invalidateRow(i);
    }
  },

  setTree: function(treebox) {
    this.treebox = treebox;
  },

  isContainer: function(row) {
    return this.visibleData[row].type == "object";
  },

  isSeparator: function(row) {
    return false;
  },

  isSorted: function() {
    return false;
  },

  getLevel: function(row) {
    return this.visibleData[row].level;
  },

  cycleHeader: function(col, elem) {},

  getImageSrc: function(row, col) {
    return null;
  },

  getRowProperties: function(row, props) {},

  getCellProperties: function(row, col) {
    if (this.visibleData[row].wlType == TYPE_INTERNAL) {
      return "tinyjsdWlInternal";
    }
    return "";
  },

  canDrop: function(row, orientation, data) {
    return false;
  },

  getColumnProperties: function(colid, col, props) {},

  isContainerEmpty: function(row) {
    return false;
  },

  getParentIndex: function(idx) {
    TinyJsd.DEBUG("getParentIndex:" + idx);

    return -1;
    /*
    if (this.isContainer(idx)) return -1;

    for (let t = idx - 1; t >= 0 ; t--) {
      if (this.isContainer(t)) return t;
    } */
  },

  isContainerOpen: function(row) {
    return this.visibleData[row].children;
  },

  evaluateRow: function(row) {

    TinyJsd.DEBUG("evaluateRow: " + this.visibleData[row].watch);
    let v = TinyJsd.getWlResult(this.visibleData[row].watch);
    let type = typeof v;
    TinyJsd.DEBUG("evaluateRow: got type: " + type);


    this.visibleData[row].type = type;
    switch (type) {
      case "number":
      case "string":
      case "boolean":
        this.visibleData[row].value = v;
        if (this.visibleData[row].children) {
          TinyJsd.DEBUG("type changed from obj to single:" + row);
          this.toggleOpenState(Number(row));
        }
        break;
      case "undefined":
        this.visibleData[row].value = "(n/a)";
        break;
      case "object":
        switch (v.type) {
          case "exception":
            this.visibleData[row].value = "(n/a)";
            break;
          case "Array":
            this.visibleData[row].value = "[ Array (" + v.length + ") ]";
            break;
          default:
            this.visibleData[row].value = "[ " + v.type + " ]";
        }
        break;
      default:
        this.visibleData[row].value = "[ -" + type + "- ]";
    }
  },

  toggleOpenState: function(row) {
    TinyJsd.DEBUG("toggleOpenState:" + row);
    var w = this.visibleData[row];
    if (w.type != "object") return;

    if (!w.children) {
      TinyJsd.DEBUG("toggleOpenState: opening");

      // append children
      w.children = true;
      let newElem = 0;

      TinyJsd.DEBUG("toggleOpenState: evaluating: " + this.visibleData[row].watch);

      let res = TinyJsd.getWlResult(this.visibleData[row].watch);

      if (typeof res != "object") {
        w.children = false;
        return;
      }

      if (res.type == "exception") return;

      for (let i in res.props) {

        ++newElem;
        let l = w.watch;
        if (typeof(res.props[i]) == "number") {
          l += "[" + res.props[i] + "]";
        }
        else {
          l += "['" + res.props[i].replace(/'/g, "\\'") + "']";
        }

        let v = TinyJsd.getWlResult(l);
        this.visibleData.splice(row + newElem, 0, {
          watch: l,
          label: res.props[i],
          value: "",
          type: "",
          wlType: TYPE_CHILD,
          level: this.visibleData[row].level + 1,
          children: false
        });
        this.treebox.rowCountChanged(row + newElem, 1);
        this.evaluateRow(row + newElem);
      }
    }
    else {
      TinyJsd.DEBUG("toggleOpenState: closing " + this.visibleData[row].watch);
      w.children = false;
      let check = this.visibleData[row].watch + "[";

      let r = 0;
      let j = 1 + row + r;
      while (row + 1 + r < this.visibleData.length &&
        this.visibleData[row + 1 + r].watch.indexOf(check) == 0) {
        ++r;
      }

      this.visibleData.splice(row + 1, r);
      this.treebox.rowCountChanged(row, -r);

    }
  },

  canDelete: function(row) {
    return (this.visibleData[row].level == 0 &&
      this.visibleData[row].wlType == TYPE_USER);
  },

  deleteItems: function(indexes) {
    // these indexes refer to the viewed items
    for (let i = indexes.length - 1; i >= 0; i--) {
      let idx = indexes[i];
      TinyJsd.DEBUG("deleting: " + idx + " - " + this.visibleData[idx].watch);

      if (this.visibleData[idx].level != 0) continue;
      if (this.visibleData[idx].wlType == TYPE_INTERNAL) continue;

      let wl = this.visibleData[idx].watch;
      let wlIdx = this.watchList.indexOf(wl);

      let end = idx + 1;
      while (end < this.visibleData.length && this.visibleData[end].level > 0) {
        ++end;
      }

      TinyJsd.DEBUG("deleting: from " + idx + " to " + end);

      this.watchList.splice(wlIdx, 1);
      this.visibleData.splice(idx, end - idx);
      this.treebox.rowCountChanged(idx, idx - end);
    }
  },

  deleteAllItems: function() {
    // delete everything
    this.treebox.rowCountChanged(0, -this.visibleData.length);
    this.watchList.splice(0, this.watchList.length);
    this.visibleData.splice(0, this.visibleData.length);
    // re-add undeletable objects
    this.addGlobalObj();
    this.updateAll();
  }
};
