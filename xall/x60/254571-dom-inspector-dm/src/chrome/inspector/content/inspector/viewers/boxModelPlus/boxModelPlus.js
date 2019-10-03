/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Joe Hewitt <hewitt@netscape.com> (original author)
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

/***************************************************************
* BoxModelViewer --------------------------------------------
*  The viewer for the boxModel and visual appearance of an element.
* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
* REQUIRED IMPORTS:
*   chrome://inspector/content/jsutil/xpcom/XPCU.js
****************************************************************/

//////////// global variables /////////////////////

var viewer;

//////////// global constants ////////////////////

//const kIMPORT_RULE = Components.interfaces.nsIDOMCSSRule.IMPORT_RULE;

//////////////////////////////////////////////////

window.addEventListener("load", BoxModelViewer_initialize, false);

function BoxModelViewer_initialize()
{
  viewer = new BoxModelViewer();
  viewer.initialize(parent.FrameExchange.receiveData(window));
}

////////////////////////////////////////////////////////////////////////////
//// class BoxModelViewer

function BoxModelViewer()
{
  this.mURL = window.location;
  this.mObsMan = new ObserverManager(this);
}

BoxModelViewer.prototype = 
{
  ////////////////////////////////////////////////////////////////////////////
  //// Initialization
  
  mSubject: null,
  mPane: null,
  
  ////////////////////////////////////////////////////////////////////////////
  //// interface inIViewer

  get uid() { return "boxModelPlus" },
  get pane() { return this.mPane },

  get subject() { return this.mSubject },
  set subject(aObject) 
  {
    this.mSubject = aObject instanceof Components.interfaces.nsIDOMNode ?
      aObject : aObject.DOMNode;
    this.showStats();
    this.mObsMan.dispatchEvent("subjectChange", { subject: this.mSubject });
  },

  initialize: function   initialize(aPane)
  {
    this.initGroup(this.groupPosition );
    this.initGroup(this.groupDimension);
    this.initGroup(this.groupMargin   );
    this.initGroup(this.groupBorder   );
    this.initGroup(this.groupPadding  );

    this.initGroup(this.groupOther  );

    //set Titles
    this.setSideTitles(this.groupMargin );
    this.setSideTitles(this.groupBorder );
    this.setSideTitles(this.groupPadding);
	
    this.mPane = aPane;
    aPane.notifyViewerReady(this);
  },

  groupPosition:  {  groupType: "position" , fieldNames: [ "X",     "Y",     "ScreenX", "ScreenY" ] },
  groupDimension: {  groupType: "dimension", fieldNames: [ "Width", "Height" ]                      },
  groupMargin:    {  groupType: "margin"   , fieldNames: [ "Top",   "Right", "Bottom",  "Left"    ] },
  groupBorder:    {  groupType: "border"   , fieldNames: [ "Top",   "Right", "Bottom",  "Left"    ] },
  groupPadding:   {  groupType: "padding"  , fieldNames: [ "Top",   "Right", "Bottom",  "Left"    ] },

  groupOther:     {  groupType: "other"    , fieldNames: [ "Mozappear", "Display", "Visibility", "Position"  ] }, //,   "xxx", "xxx",  "xxxx"
  
  //fieldNames: this.boxSide DOESN'T WORK (ovbiously), what should be used here instead??

  boxSide:   [ "Top",   "Right", "Bottom",  "Left"    ],

  initGroup: function BMVr_InitGroup(aGroup, isTitle)
  {
    if (! isTitle) {
      this.initGroup(aGroup, true);
    }

    for (let i = 0; i < aGroup.fieldNames.length; i ++) {
      var field = aGroup.fieldNames[i];

      if (aGroup.groupType == "border" && ! isTitle) { // NOT titles!
        this.initFieldObj(aGroup, field + "_1", isTitle);
        this.initFieldObj(aGroup, field + "_2", isTitle);
      }
      this  .initFieldObj(aGroup, field       , isTitle);
    }
/*
   try{
   }catch(ex){
      throw ex+"  -  "+ex.stack+"  -  groupType: "+aGroup.groupType+;
   }
*/
  },
  
  initFieldObj: function BMVr_InitFieldObj(aGroup, field, isTitle)
  {
    if (!aGroup[field.toLowerCase()]) {
         aGroup[field.toLowerCase()] = {};
    }
    var objField = aGroup[field.toLowerCase()];
    objField[isTitle ? "label" : "value"] = this.getXulLabel(aGroup.groupType + field, isTitle);
  },

  getXulLabel: function(sId, isTitle)
  {
    sId += isTitle ? "Label" : "Value";
    var elem= document.getElementById(sId);
    if ( ! elem ) {
        throw "No element found. id="+sId; // early catch for any missing elem.
    }
    return elem;
  },

  destroy: function()
  {
  },

  isCommandEnabled: function(aCommand)
  {
    return false;
  },
  
  getCommand: function(aCommand)
  {
    return null;
  },

  ////////////////////////////////////////////////////////////////////////////
  //// event dispatching

  addObserver: function(aEvent, aObserver) { this.mObsMan.addObserver(aEvent, aObserver); },
  removeObserver: function(aEvent, aObserver) { this.mObsMan.removeObserver(aEvent, aObserver); },
  
  ////////////////////////////////////////////////////////////////////////////
  //// statistical updates
  
  showStats: function showStats()
  {
   try{
	
    this.showPositionStats();
    this.showDimensionStats();
    this.showMarginStats();
    this.showBorderStats();
    this.showPaddingStats();
	
    this.showOtherStats();
	
   }catch(ex){	
	  setTimeout(function(){
		  var myErr= new Error(""+ex+"   -   \n"+ex.stack, "");
		  myErr.stack= ex.stack;
		  throw myErr;
	  }, 0);
	  throw ex;
   }

  },
  
  setTitle: function   setTitle(aElement, aSide)
  {
    aElement.setAttribute("value", aSide ); //&& aSide.length ? aSide + ":" : ""
  },
  
  showStatistic: function   showStatistic(aFieldObj,  aSize, aTitle)
  {
    if (aSize === null || aSize === undefined) {
      aSize = "";
    }
    if (aTitle) {
      aFieldObj.label.setAttribute("value", aTitle);
    }
    
    var aElement = aFieldObj.value;
    aElement.setAttribute("value", (""+aSize).replace("px",""));

    var str = aSize.toString();
    var hasUnit = str.indexOf("px") >= 0;
    
    aElement.setAttribute("hasUnit", hasUnit? "true" : "false");

    var nonzero = !!( ! hasUnit ? aSize : str.indexOf("0px") ) && str != "none"; //TODO: improve logic here!

    var clazz= "value"; //tabbable? //plain <- if using textbox!
    aElement.setAttribute("class", nonzero ? clazz + " nonzero" : clazz + "");
  },
  
  getParentNode: function(aElement,  aNodeName)
  {
    var thisElement= aElement;
    for (let i = 0; i < 3; i ++) {
      thisElement = thisElement.parentNode;
      if (thisElement.nodeName.toLowerCase() == aNodeName.toLowerCase()) {
        return thisElement;
      }
    }
    return aElement;
  },
  
  showPositionStats: function()
  {
    var group = this.groupPosition;
    if (!group.screenxAncestorRow) {
      group.screenxAncestorRow = this.getParentNode(group.screenx.label, "ROW");
      group.screenyAncestorRow = this.getParentNode(group.screeny.label, "ROW");
    }
    if ("boxObject" in this.mSubject) { // xul elements
      var bx = this.mSubject.boxObject;
      this.showStatistic(group.x, bx.x, "box x");
      this.showStatistic(group.y, bx.y, "box y");
      this.showStatistic(group.screenx, bx.screenX);
      this.showStatistic(group.screeny, bx.screenY);
      group.screenxAncestorRow.hidden = false;
      group.screenyAncestorRow.hidden = false;
    } else { // html elements
      this.showStatistic(group.x, this.mSubject.offsetLeft, "offset left");
      this.showStatistic(group.y, this.mSubject.offsetTop,  "offset top" );
      this.showStatistic(group.screenx, ""); // to make sure of clean space
      this.showStatistic(group.screeny, ""); // to make sure of clean space
      group.screenxAncestorRow.hidden = true;
      group.screenyAncestorRow.hidden = true;
    }
  },
  
  showDimensionStats: function()
  {
    var group = this.groupDimension;
    var eWidth, eHeight;
    if ("boxObject" in this.mSubject) { // xul elements
      var bx = this.mSubject.boxObject;
      this.showStatistic(group.width,  eWidth  = bx.width,  "box width" );
      this.showStatistic(group.height, eHeight = bx.height, "box height");
      // "content width, height"
    } else { // html elements
      this.showStatistic(group.width,  eWidth  = this.mSubject.offsetWidth,  "offset width" );
      this.showStatistic(group.height, eHeight = this.mSubject.offsetHeight, "offset height");
      // "content width, height"
      //.clientWidth .width
    }
    
    var dataCompareArr = [eWidth,
                          eHeight,
                          0,
                          0];

    var dataScrollArr  = [this.mSubject.scrollWidth,
                          this.mSubject.scrollHeight,
                          this.mSubject.scrollLeft,
                          this.mSubject.scrollTop];
	/* client+border = box
    var dataClientArr  = [this.mSubject.clientWidth,
                          this.mSubject.clientHeight,
                          this.mSubject.clientLeft,
                          this.mSubject.clientTop];
	*/

    this.setSignificantData_extra(dataScrollArr, dataCompareArr, ["ΔscrollW","ΔscrollH","scrollLeft","scrollTop"]);
    //is.setSignificantData_extra(dataClientArr, dataCompareArr, ["client"  ,"xxxx"    ,"xxxx"      ,"xxxx"]);
    
  },

  setSignificantData_extra: function   setSignificantData_extra(dataArr, dataCompareArr, dataTitleArr)
  {
    var bDifferent = false;
    for (let i = 0; i < dataArr.length; i ++) {
	  if (isNaN(dataArr[i]) || isNaN(dataCompareArr[i])) {
		bDifferent = false;
		break;
	  }
      if (dataArr[i] != dataCompareArr[i]) {
        bDifferent = true;
      }
    }
    if (bDifferent) {
	  var labelArr =   [this.groupDimension.width,
						this.groupDimension.height,
						this.groupPosition.x,
						this.groupPosition.y];
      for (let i = 0; i < dataArr.length; i ++) {
         //var extraStr = dataTitleArr[i] + ": " + (dataArr[i] - dataCompareArr[i]);
         labelArr[i].label.value = i > 1 ? (
									dataTitleArr[i] + 
										": " + 
											(dataArr[i] - dataCompareArr[i]) + 
												"    " + 
													labelArr[i].label.value ) : (
													labelArr[i].label.value + 
												"    " + 
											(dataArr[i] - dataCompareArr[i]) + 
										" :" + 
									dataTitleArr[i] 
								);
      }
    }
  },
  
  getSubjectComputedStyle: function()
  {
    var view = this.mSubject.ownerDocument.defaultView;
    return view.getComputedStyle(this.mSubject, "");
  },

  showMarginStats: function()
  {
    var style = this.getSubjectComputedStyle();
    var data = [this.readMarginStyle(style, "top"), this.readMarginStyle(style, "right"), 
                this.readMarginStyle(style, "bottom"), this.readMarginStyle(style, "left")];
    this.showSideStats(this.groupMargin, data);
  },

  showBorderStats: function()
  {
    var style = this.getSubjectComputedStyle();
    var data = [this.readBorderStyle(style, "top"), this.readBorderStyle(style, "right"), 
                this.readBorderStyle(style, "bottom"), this.readBorderStyle(style, "left")];
    this.showSideStats(this.groupBorder, data);
  },

  showPaddingStats: function()
  {
    var style = this.getSubjectComputedStyle();
    var data = [this.readPaddingStyle(style, "top"), this.readPaddingStyle(style, "right"), 
                this.readPaddingStyle(style, "bottom"), this.readPaddingStyle(style, "left")];
    this.showSideStats(this.groupPadding, data);
  },


  setSideTitles: function   setSideTitles(aGroup)
  {
    for (let i = 0; i < this.boxSide.length; i ++) {
      var aField = this.boxSide[i].toLowerCase();
      this.setTitle(aGroup[aField].label, aField);
    }
  },


  showSideStats: function   showSideStats(aGroup, aData)
  {
    for (let i = 0; i < this.boxSide.length; i ++) {
      var aSize  = aData[i];
      var aField = this.boxSide[i].toLowerCase();
      
      if (aGroup.groupType == "border") {
        if( aSize.length == 3 ){
          aGroup[aField + "_1"].value.setAttribute("value", aSize[1]);
          aGroup[aField + "_2"].value.setAttribute("value", aSize[2]);

          aSize= aSize[0];
        }else{
          throw "aSize.length != 3";
        }
      }
      this.showStatistic(aGroup[aField],    aSize);
    }
  },
  
 
  showOtherStats: function   showOtherStats(){
  
	var aGroup= this.groupOther;
	
    //var style = this.mSubject.style;
	var style = this.getSubjectComputedStyle();
	
    this.showStatistic(aGroup["mozappear"],    this.getPropertyCSSValue_text(style, "-moz-appearance"),   "-moz-appearance:");
    
	this.showStatistic(aGroup["display"]  ,    this.getPropertyCSSValue_text(style, "display")        ,   "display:");

	this.showStatistic(aGroup["visibility"],   this.getPropertyCSSValue_text(style, "visibility")     ,   "visibility:");
	
	this.showStatistic(aGroup["position"] ,    this.getPropertyCSSValue_text(style, "position")       ,   "position:");
  },
  
  getPropertyCSSValue_text: function   getPropertyCSSValue_text(aStyle, propName){
	if( !aStyle ){
		return "(style is null)";
	}
	var propValue= aStyle.getPropertyCSSValue(propName);
    return propValue===null || propValue===undefined? (propValue+""): propValue.cssText;
  },

  readMarginStyle:  function(aStyle, aSide)
  {
    return  this.getPropertyCSSValue_text(aStyle,  "margin-"+aSide);
  },
  readPaddingStyle: function(aStyle, aSide)
  {
    return  this.getPropertyCSSValue_text(aStyle, "padding-"+aSide);
  },
  readBorderStyle:  function(aStyle, aSide)
  {
    if (!aStyle) {
      return ["(style is null)", "", ""];
    } 
    return [this.getPropertyCSSValue_text(aStyle,  "border-"+aSide+"-width") + "", 
            this.getPropertyCSSValue_text(aStyle,  "border-"+aSide+"-style") + "",
            this.getPropertyCSSValue_text(aStyle,  "border-"+aSide+"-color")];
  },
  
  /*
  objToString : function(obj, iLevel){
    
      if( iLevel < 1 ){
        return ""+obj;
      }
      try{
        //this.myDumpToConsole("about to print obj: ");
        //this.myDumpToConsole("                       "+obj);
        var isLengthyObj= true;//( (""+obj) == "[object ChromeWindow]");
        
        var temp = "\n "+obj+"[";
        var sComma="\n     ";
        var xContent= "";

        var x;
        for (x in obj){
            try{
                xContent= ("" + obj[x] + "").substr(0,170); //"\n" // ((("+this.objToStringSmall(x)+")))
            }catch(ex){ xContent= "((( error: " + ex + ")))"; };    
            //sComma= ", ";
            
            var ixObject = xContent.indexOf("object " );
            if ( ixObject >= 0 && ixObject < 3 ) {
                xContent = "{"+this.objToString(obj[x], iLevel - 1)+"}";
            }
            
            if(  isLengthyObj && 
                 xContent.indexOf("function ")==0 ){
                continue;
            }
            temp += sComma + x + ": " + xContent;
            //sComma= ", ";
        }
        temp += "\n ] \n";
        return temp
      }
      catch(ex){ //this.debugError("error printing obj: "+obj+"     "+ex, ex);
          return "(Error:"+ex+"   "+ex.stack+")";    
      };    
      return "(Error!)";    
      
      //return ""+obj;
  },
  */
};
