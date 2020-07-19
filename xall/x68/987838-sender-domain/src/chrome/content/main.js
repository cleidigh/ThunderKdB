if (typeof(XULcrz) == "undefined") 
	{
	var XULcrz = 
		{
		init:function()	{
				this.Cc = Components.classes;
				this.Ci = Components.interfaces;
				this.headerParser = XULcrz.Cc["@mozilla.org/messenger/headerparser;1"].getService(XULcrz.Ci.nsIMsgHeaderParser);
			}
		};
	(function()	
		{
		this.init();
		}).apply(XULcrz);
	};



XULcrz.ColumnHandler=function(queriedId)
{
	this._queriedId = queriedId;
};

XULcrz.ColumnHandler.prototype	=	
{
	_queriedId:	null,
	
	get queriedId() {
 			return this._queriedId;
	},

  	getCellText:function(row, col) {
  	  var key = gDBView.getKeyAt(row);
	  var hdr = gDBView.db.GetMsgHdrForKey(key);
	  var temp = hdr.getStringProperty("sender");
	  var email = XULcrz.headerParser.extractHeaderAddressMailboxes(temp);
	  if(this.queriedId=="senderReverse")
	   return email.split("@")[1].split(".").reverse().join(".");
	  return email.split("@")[1];	   
  	},
  
	getSortStringForRow:function(hdr) {
			var temp = hdr.getStringProperty("sender");
			var email = XULcrz.headerParser.extractHeaderAddressMailboxes(temp);		
			if(this.queriedId=="senderReverse")
				return email.split("@")[1].split(".").reverse().join(".");
			return email.split("@")[1];			
	},
  
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {return 0;}
};




XULcrz.addCustomColumnHandler	=	function(aqueriedId, aObjName)
{
	let CustomCol = new XULcrz.ColumnHandler(aqueriedId);
	gDBView.addColumnHandler(aObjName, CustomCol);
};



XULcrz.CreateDbObserver =
{
	observe: function(aMsgFolder, aTopic, aData) {  
		XULcrz.addCustomColumnHandler("sender","crz_senderCol");
		XULcrz.addCustomColumnHandler("senderReverse","crz_senderReverseCol");
	}
};



XULcrz.doOnceLoaded = function()
{
	
	ObserverService = XULcrz.Cc["@mozilla.org/observer-service;1"].getService(XULcrz.Ci.nsIObserverService);
  	ObserverService.addObserver(XULcrz.CreateDbObserver, "MsgCreateDBView", false);
};




window.addEventListener("load", XULcrz.doOnceLoaded, false);
