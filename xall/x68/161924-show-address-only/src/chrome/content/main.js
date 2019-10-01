/*	***** BEGIN LICENSE BLOCK *****
		*	
		*	"Show Address Only"
		*	Adds columns to display Sender/Recipients mailaddress only.
		*	Copyright (C) 2010  Pavel Kramnik <rip239@gmail.com>
		*
		*	This program is free software: you can redistribute it and/or modify
		*	it under the terms of the GNU General Public License as published by
		*	the Free Software Foundation, either version 3 of the License, or
		*	(at your option) any later version.
		*	
		*	This program is distributed in the hope that it will be useful,
		*	but WITHOUT ANY WARRANTY; without even the implied warranty of
		*	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
		*	GNU General Public License for more details.
		*	
		*	You should have received a copy of the GNU General Public License
		*	along with this program.  If not, see <http://www.gnu.org/licenses/>.
		*
		* ***** END LICENSE BLOCK *****	*/

// XULsao namespace.
if (typeof(XULsao) == "undefined") 
	{
	var XULsao = 
		{
		init:	function()	
			{
			this.Cc = Components.classes;
			this.Ci = Components.interfaces;
			this.hdrParser = XULsao.Cc["@mozilla.org/messenger/headerparser;1"].getService(XULsao.Ci.nsIMsgHeaderParser);
			}
		};
	(function()	
		{
		this.init();
		}).apply(XULsao);
	};

//	Class
XULsao.ColumnHandler	=	function(aHdrAttr)
{
this._HdrAttr = aHdrAttr;
};

XULsao.ColumnHandler.prototype	=	
{
	_HdrAttr:	null,
	
	get HdrAttr()
		{
 		return this._HdrAttr;
		},

  getCellText:	function(row, col) 
		{
  	var key = gDBView.getKeyAt(row);
  	var hdr = gDBView.db.GetMsgHdrForKey(key);
  	return XULsao.hdrParser.extractHeaderAddressMailboxes(hdr.getStringProperty(this.HdrAttr));
  	},
  
	getSortStringForRow: function(hdr) 
		{
		return XULsao.hdrParser.extractHeaderAddressMailboxes(hdr.getStringProperty(this.HdrAttr));
		},
  
	isString:            function() {return true;},

  getCellProperties:   function(row, col, props){},
  getRowProperties:    function(row, props){},
  getImageSrc:         function(row, col) {return null;},
  getSortLongForRow:   function(hdr) {return 0;}
};

//	Methods
XULsao.addCustomColumnHandler	=	function(aHdrAttr, aObjName)
{
	let CustomCol = new XULsao.ColumnHandler(aHdrAttr);
	gDBView.addColumnHandler(aObjName, CustomCol);
};


XULsao.CreateDbObserver =
{
observe: function(aMsgFolder, aTopic, aData)
	{  
  XULsao.addCustomColumnHandler("sender","sao_senderCol");
  XULsao.addCustomColumnHandler("recipients","sao_recipientsCol");
  }
};

XULsao.doOnceLoaded = function()
{
	ObserverService = XULsao.Cc["@mozilla.org/observer-service;1"].getService(XULsao.Ci.nsIObserverService);
  ObserverService.addObserver(XULsao.CreateDbObserver, "MsgCreateDBView", false);
};

//	Launch
window.addEventListener("load", XULsao.doOnceLoaded, false);