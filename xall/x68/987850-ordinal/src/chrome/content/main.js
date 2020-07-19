var columnHandler = {
    getCellText: function(row, col) {
       return row + 1;
    },
    getSortStringForRow: function(hdr) { 
		return null; 
	},
    isString: function() {
		return false;
	}, 
    getCellProperties: function(row, col, props) {},
    getRowProperties: function(row, props) {},
    getImageSrc: function(row, col) {
		return null;
	},
    getSortLongForRow: function(hdr) {
		return 0;
	}
};

var observer = {
	observe: function(aMsgFolder, aTopic, aData) {  
		gDBView.addColumnHandler("ordinal", columnHandler);
	}
};

var main = function() {
	ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	ObserverService.addObserver(observer, "MsgCreateDBView", false);
};

window.addEventListener("load", main, false);