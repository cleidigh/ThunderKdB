/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Message Archive Options.
 *
 * The Initial Developer of the Original Code is
 * eviljeff.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

	  
var preferenceService=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.messagearchiveoptions@eviljeff.com.");

window.addEventListener("load", function () {
  Application.console.log("MessageArchiveOptions:load function");
  
  // setting value on the textbox is broken somehow (its still t or v after setting) so below is pointless currently.
  /*
  var granularityRG= document.getElementById("archiveGranularity");
  document.getElementById("year.textbox").value=preferenceService.getComplexValue("yearstring",Components.interfaces.nsISupportsString).toString();
  //Application.console.log("MessageArchiveOptions:"+document.getElementById("year.textbox").value);
  document.getElementById("month.textbox").value=preferenceService.getComplexValue("monthstring",Components.interfaces.nsISupportsString).toString();
  
  granularityRG.insertBefore(document.getElementById("year.hbox"),granularityRG.lastChild);
  granularityRG.insertBefore(document.getElementById("month.hbox"),null);	
  */
  var archiveTree= document.getElementById("archiveTree");
  var monthFormat=preferenceService.getComplexValue("monthstring",Components.interfaces.nsISupportsString).toString();//document.getElementById("month.textbox").value;
  var yearFormat =preferenceService.getComplexValue("yearstring", Components.interfaces.nsISupportsString).toString();//document.getElementById("year.textbox").value;
  var cells = archiveTree.getElementsByTagName("treecell"); 
  Application.console.log("MessageArchiveOptions:"+monthFormat+","+yearFormat+","+cells.length);
  for (var i = 0; i < cells.length; i++) { 
	  switch (cells[i].getAttribute("label")) {
		  case "2010"   : cells[i].setAttribute("label",(new Date(2010,11,1)).toLocaleFormat(yearFormat) ); break;
		  case "2010"   : cells[i].setAttribute("label",(new Date(2011, 1,1)).toLocaleFormat(yearFormat) ); break;
		  case "2010-11": cells[i].setAttribute("label",(new Date(2010,11,1)).toLocaleFormat(monthFormat)); break;
		  case "2010-12": cells[i].setAttribute("label",(new Date(2010,12,1)).toLocaleFormat(monthFormat)); break;
		  case "2011-01": cells[i].setAttribute("label",(new Date(2010, 1,1)).toLocaleFormat(monthFormat)); break;
		  case "2011-02": cells[i].setAttribute("label",(new Date(2010, 2,1)).toLocaleFormat(monthFormat)); break;
	  }
  }
},false);