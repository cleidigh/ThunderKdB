EnhancedDateFormatter.ColumnHandler = function(colName) {
    this.colName = colName;
};

EnhancedDateFormatter.ColumnHandler.prototype = {
    getCellText: function(row, col) {
        //get the message's header so that we can extract the date field
        var hdr = gDBView.getMsgHdrAt(row);
        var date = new Date(this._fetchDate(hdr));
        
        return EnhancedDateFormatter.strftime(EnhancedDateFormatter.getDateFormatForDate(date), date);
    },
    _fetchDate: function(hdr) {
        if (this.colName == "dateCol") {
            return hdr.date / 1000;
        } else if (this.colName == "receivedCol") {
            return hdr.getUint32Property("dateReceived") * 1000;
        } else {
            return null;
        }
    },
    getSortStringForRow: function(hdr) {return hdr.date;},
    isString:            function() {return true;},
    
    getCellProperties:   function(row, col, props){},
    getRowProperties:    function(row, props){},
    getImageSrc:         function(row, col) {return null;},
    getSortLongForRow:   function(hdr) {return hdr.date;}
};

EnhancedDateFormatter.CreateDbObserver = {
  // Components.interfaces.nsIObserver
  observe: function(aMsgFolder, aTopic, aData)
  {  
      if (EnhancedDateFormatter.preferences.getValue('useCustomFormatsForDateColumn', false)) {
          gDBView.addColumnHandler("dateCol", new EnhancedDateFormatter.ColumnHandler('dateCol'));
      }

      if (EnhancedDateFormatter.preferences.getValue('useCustomFormatsForReceivedColumn', false)) {
          gDBView.addColumnHandler("receivedCol", new EnhancedDateFormatter.ColumnHandler('receivedCol'));
      }
  }
};

EnhancedDateFormatter.FormatMessagePaneDate = function() {
    var date = new Date(currentHeaderData["date"].headerValue);
    currentHeaderData["x-mozilla-localizeddate"].headerValue = EnhancedDateFormatter.strftime(EnhancedDateFormatter.getDateFormatForDate(date), date);
}

EnhancedDateFormatter.doOnceLoaded = function() {
    var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(EnhancedDateFormatter.CreateDbObserver, "MsgCreateDBView", false);
    if (EnhancedDateFormatter.preferences.getValue('useCustomFormatsForMessagePane', false)) {
        gMessageListeners.push({
            onStartHeaders: function () {},
            onEndHeaders: function () {},
            onEndAttachments: function () {},
            onBeforeShowHeaderPane: EnhancedDateFormatter.FormatMessagePaneDate
        });
    }
};

window.addEventListener("load", EnhancedDateFormatter.doOnceLoaded, false);
