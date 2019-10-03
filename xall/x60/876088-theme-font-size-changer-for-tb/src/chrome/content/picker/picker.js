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
 * The Original Code is Rainbow.
 *
 * The Initial Developer of the Original Code is
 * Heather Arthur.
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
var picker = {
  askColorPickerElementValue:function(){
     
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow); 
                  var f= window.opener.ThemeFontSizeChanger.askColorPickerElementValue(); 
                  if(f=="fontcolor") f="color";
 
  	    // document.getElementById("gg").firstChild.nodeValue=f;  
  	     return f; 
  },
  backStack : [],

  forwardStack : [],

  highlightClass : "highlight",

  init : function() {
    picker.wholeNumbers = themefontsizechangertbrainbowc.prefs.getBoolPref("wholeNumbers");
    var mode = themefontsizechangertbrainbowc.prefs.getCharPref("picker.mode");
    var color;
    if(window.arguments)
      color = window.arguments[0];

    if(!color || !colorCommon.isValid(color)) // otherwise get their last-viewed color
      color = themefontsizechangertbrainbowc.prefs.getCharPref("picker."+picker.askColorPickerElementValue());

//alert(picker.askColorPickerElementValue())
       picker.format = themefontsizechangertbrainbowc.prefs.getCharPref("format");

    if(themefontsizechangertbrainbowc.prefs.getBoolPref("picker.hsl"))
      themefontsizechangertbrainbowc.get("hsl-row").hidden = false;
    else
      themefontsizechangertbrainbowc.get("hsl-row").hidden = true;

    picker.displayElem = themefontsizechangertbrainbowc.get("display-color-1");

    picker.selectColor(color, true);
    picker.changeMode(mode);
 
    /* for platform-specific styles */
    var platform = themefontsizechangertbrainbowc.getPlatform();
    var rwin = themefontsizechangertbrainbowc.get("themefontsizechangertbrainbow-picker-window");
    rwin.setAttribute("themefontsizechangertbrainbow-platform", platform);

    setTimeout(picker.switchDark, 200); // wait for theme to apply, doesn't at onload
    //window.setTimeout(function(){window.sizeToContent()},1);
  },

  selectRadio : function(mode) {
     switch(mode) {
      case 'sat':
        themefontsizechangertbrainbowc.get("radio-h").setAttribute("selected", false);
        themefontsizechangertbrainbowc.get("radio-s").setAttribute("selected", true);
        themefontsizechangertbrainbowc.get("radio-v").setAttribute("selected", false);
        break;
      case 'val':
        themefontsizechangertbrainbowc.get("radio-h").setAttribute("selected", false);
        themefontsizechangertbrainbowc.get("radio-s").setAttribute("selected", false);
        themefontsizechangertbrainbowc.get("radio-v").setAttribute("selected", true);
        break;
      case 'hue': default:
        themefontsizechangertbrainbowc.get("radio-h").setAttribute("selected", true);
        themefontsizechangertbrainbowc.get("radio-s").setAttribute("selected", false);
        themefontsizechangertbrainbowc.get("radio-v").setAttribute("selected", false);
        break;
    }
  },

  switchDark : function() {
    var container = themefontsizechangertbrainbowc.get("container");
    var bg = themefontsizechangertbrainbowc.getWindowPixel(window, container.boxObject.x, container.boxObject.y);
   
    if(colorCommon.luminosity(bg) > .5)
      return; // it's light enough

    /* for the dark themes */
    var barsel = themefontsizechangertbrainbowc.get("bar-sel");
    barsel.src = "chrome://themefontsizechangertb/skin/arrows-white.png";

    var selector = themefontsizechangertbrainbowc.get("selector-icon");
    selector.style.border = " white dashed 1px";

    var inspector = themefontsizechangertbrainbowc.get("inspector-button");
    inspector.style.listStyleImage = "url('chrome://themefontsizechangertb/skin/plus-white.png')";

    picker.highlightClass = "highlight-light";
  },

  unload : function() {
  	window.opener.ThemeFontSizeChanger.colorPickerRevertBack();
  	    if(picker.color)
      themefontsizechangertbrainbowc.prefs.setCharPref("picker."+picker.askColorPickerElementValue(), picker.color);
    if(picker.mode)
      themefontsizechangertbrainbowc.prefs.setCharPref("picker.mode", picker.mode);

    if(selector.selectedElement)
      selector.stop();
    inspector.stop();
  },

  visitColor : function(color, changeString, fromInput) {
    var back = themefontsizechangertbrainbowc.get("back-button");
    var forward = themefontsizechangertbrainbowc.get("forward-button");

    var stack = picker.backStack;
    if(!stack.length || stack[stack.length - 1] != picker.color) { 
      // don't visit same color twice in a row
      stack.push(picker.color);
      back.disabled = false;
      picker.forwardStack = [];
      forward.disabled = true;
    }

    picker.selectColor(color, changeString, fromInput);
    picker.url = "";
  },

  back : function() {
    var back = themefontsizechangertbrainbowc.get("back-button");
    var forward = themefontsizechangertbrainbowc.get("forward-button");

    if(back.disabled) // rapid clicking race condition
     return;

    picker.forwardStack.push(picker.color);
    forward.disabled = false;
    var newColor = picker.backStack.pop();
    if(picker.backStack.length == 0)
      back.disabled = true;
    
    picker.selectColor(newColor, true);
    picker.inspectColor(newColor);
  },

  forward: function() {
    var back = themefontsizechangertbrainbowc.get("back-button");
    var forward = themefontsizechangertbrainbowc.get("forward-button");

    if(forward.disabled)
      return;

    picker.backStack.push(picker.color);
    back.disabled = false;
    var newColor = picker.forwardStack.pop();
    if(picker.forwardStack.length == 0)
      forward.disabled = true;
 
    picker.selectColor(newColor, true);
    picker.inspectColor(newColor);
  },

  changeMode : function(mode) {
    var topGradient = themefontsizechangertbrainbowc.get("top-gradient");
    var bottomGradient = themefontsizechangertbrainbowc.get("bottom-gradient");
    var bar = themefontsizechangertbrainbowc.get("bar");
    var topBar = themefontsizechangertbrainbowc.get("top-bar");

    switch(mode) {
      case 'hue':
        bottomGradient.src = "chrome://themefontsizechangertb/skin/hue-top.png";
        topGradient.style.opacity = "0";
        bar.src="chrome://themefontsizechangertb/skin/hue-bar.png";
        topBar.style.opacity = "0";
        picker.mode = 'hue';
        break;
      case 'sat':
        bottomGradient.src = "chrome://themefontsizechangertb/skin/sat-bottom.png";
        topGradient.src = "chrome://themefontsizechangertb/skin/sat-top.png";
        bar.src="chrome://themefontsizechangertb/skin/sat-bar.png";
        picker.mode = 'sat';
        break;
      case 'val':
        bottomGradient.src = "chrome://themefontsizechangertb/skin/val-bottom.png";
        topGradient.src = "chrome://themefontsizechangertb/skin/val-top.png";
        bar.src = "chrome://themefontsizechangertb/skin/val-bar.png";
        topBar.style.opacity = "0";
        picker.mode = 'val';
        break;
      default:
        break;      
    }
    picker.selectRadio(mode);
    picker.inspectColor(picker.color);
  },

  inspectColor : function(color) {
    if(!colorCommon.isValid(color))
      return;

    /* just update the position on the gradient and sidebar */
    var vals = colorCommon.hsvValues(color);
    var hue = Math.round(vals['hue'] / 360 * 255);
    var sat = Math.round(vals['satv'] / 100 * 255);
    var val = Math.round(vals['val'] / 100 * 255);
    
    switch(picker.mode) {
      case 'hue':
        picker.inspectGrad(sat, 255 - val);
        picker.inspectBar(255 - hue);
        break;
      case 'sat':
        picker.inspectGrad(hue, 255 - val);
        picker.inspectBar(255 - sat);
        break;
      case 'val':
        picker.inspectGrad(hue, 255 - sat);
        picker.inspectBar(255 - val);
        break;
      default:
        break;
    }
  },

  selectColor : function(color, changeString, fromInput) {
    if(!colorCommon.isValid(color))
      return;

    /* just update the displayed color values */
    var wholeNumbers = picker.wholeNumbers && !fromInput;
    var hexVal = colorCommon.toHex(color);
    var rgbVals = colorCommon.rgbValues(color);
    var hslVals = colorCommon.hslValues(color, wholeNumbers);
    var hsvVals = colorCommon.hsvValues(color, wholeNumbers);
    var alpha = colorCommon.alphaValue(color);
    
    if(picker.displayElem.id == "display-text")
      picker.displayElem.style.color = hexVal;
    else
      picker.displayElem.style.backgroundColor = hexVal;
    themefontsizechangertbrainbowc.get("r").value = rgbVals['red'];
    themefontsizechangertbrainbowc.get("g").value = rgbVals['green'];
    themefontsizechangertbrainbowc.get("b").value = rgbVals['blue'];
    themefontsizechangertbrainbowc.get("hv").value = hsvVals['hue'];
    themefontsizechangertbrainbowc.get("sv").value = hsvVals['satv'];
    themefontsizechangertbrainbowc.get("v").value = hsvVals['val'];
    themefontsizechangertbrainbowc.get("h").value = hslVals['hue'];
    themefontsizechangertbrainbowc.get("s").value = hslVals['sat'];
    themefontsizechangertbrainbowc.get("l").value = hslVals['light'];
    themefontsizechangertbrainbowc.get("a").value = alpha;

    if(changeString)
      picker.changeString(color, wholeNumbers);

    picker.color = hexVal;

    var button = themefontsizechangertbrainbowc.get("bookmark-button");
    if(themefontsizechangertbrainbowc.storage.isSaved(colorCommon.toHex(color))) {
      button.label = "View";
      //button.removeAttribute("oncommand"); // firefox bug
      //button.setAttribute("oncommand", "themefontsizechangertbrainbowc.openLibrary('" + picker.color + "');");
    }
    else {
      button.label = "Bookmark";
      //button.removeAttribute("oncommand");
      //button.setAttribute("oncommand", "picker.bookmark();");
    }

    if(selector.selectedElement) {
      if(picker.displayElem.id == "display-text")
        selector.selectedElement.style.color = hexVal + "";
      else
        selector.selectedElement.style.background = hexVal + "";
      picker.displayContrast();
    }
  },

  displayContrast : function() {
    var c1 = themefontsizechangertbrainbowc.get("display-text").style.color;
    if(!colorCommon.isValid(c1)) {
      themefontsizechangertbrainbowc.get("contrast").value = "   ";
      return;
    }
    var c2 = themefontsizechangertbrainbowc.get("display-color-1").style.backgroundColor;
    var contrast = Math.round(colorCommon.contrast(c1, c2));
    cstring = "contrast: %S of 21";
    themefontsizechangertbrainbowc.get("contrast").value = cstring;
  },

  changeString : function(color) {
    var string = themefontsizechangertbrainbowc.get("display-string");
    string.value = themefontsizechangertbrainbowc.getFormattedColor(color);
  },

  stringChanged : function() {
    var color = themefontsizechangertbrainbowc.get("display-string").value;
    picker.visitColor(color, false, true);
    picker.inspectColor(color);
  },

  changeFormat : function(format) {
    themefontsizechangertbrainbowc.prefs.setCharPref("format", format);
    picker.format = format;
    picker.changeString(picker.color);
  },

  fieldChanged : function(field, fromInput) {
    var color;
    switch(field) {
      case 'r': case 'g': case 'b':
        var r = themefontsizechangertbrainbowc.get("r").value;
        var g = themefontsizechangertbrainbowc.get("g").value;
        var b = themefontsizechangertbrainbowc.get("b").value;
        color = colorCommon.rgbString(r, g, b);
        break;
      case 'h': case 's': case 'l':
        var h = themefontsizechangertbrainbowc.get("h").value;
        var s = themefontsizechangertbrainbowc.get("s").value;
        var l = themefontsizechangertbrainbowc.get("l").value;
        color = colorCommon.hslString(h, s, l);
        break;
      case 'hv': case 'sv': case 'v':
        var h = themefontsizechangertbrainbowc.get("hv").value;
        var s = themefontsizechangertbrainbowc.get("sv").value;
        var v = themefontsizechangertbrainbowc.get("v").value;
        color = colorCommon.hsvString(h, s, v);
        break;
      default:
        break;
    }

    if(fromInput)
      picker.visitColor(color, true, fromInput);
    else
      picker.selectColor(color, true, fromInput);
    picker.inspectColor(color);
  },

  keyPressed : function(event, field) {
    var maximum = parseInt(field.getAttribute("maximum"));
    var val = Math.round(field.value * 10) / 10;
    var newval;

    if(event.keyCode == event.DOM_VK_UP) {
      if(picker.wholeNumbers || field.hasAttribute("integer"))
       newval = Math.round(Math.floor(val) + 1);
      else
       newval = Math.round((val + .2) * 10) / 10; //so we don't get trailing 0s
     
      if(newval > maximum)
       newval = 0;
    } 
    else if(event.keyCode == event.DOM_VK_DOWN) {
      if(picker.wholeNumbers || field.hasAttribute("integer"))
        newval = Math.round(Math.ceil(val) - 1);
      else
        newval = Math.round((val - .2) * 10) / 10;
      if(newval < 0)
        newval = maximum;
    }
    else
      return;

    field.value = newval;
    field.inputField.select();
    picker.fieldChanged(field.id, false);
  },

  fieldChange : function(field) {
    var maximum = parseInt(field.getAttribute("maximum"));
    var newval = field.value;

    if(newval > maximum)
      newval = maximum;
    else if(newval < 0)
      newval = 0;
    else if(field.hasAttribute("integer"))
      newval = Math.round(newval);

    field.value = newval;
    picker.fieldChanged(field.id, true);
  },

  selectField : function(field) {
    themefontsizechangertbrainbowc.get(field).inputField.select();
    if(field == 'hv')
      picker.changeMode('hue');
    else if(field == 'sv')
      picker.changeMode('sat');
    else if(field == 'v')
      picker.changeMode('val');
  },

  gradientClick : function (event) {
    var parent = themefontsizechangertbrainbowc.get("gradient-display");
    var x = event.clientX - parent.boxObject.x;
    var y = event.clientY - parent.boxObject.y; // get the visual feedback of click right

    picker.inspectGrad(x, y);
    var newColor = picker.getInspectedColor();

    picker.visitColor(newColor, true);
    
	//window.opener.document.getElementById("themefontsizechangertb-fontcolor-custom-menuitem").setAttribute("label",picker.color);
	//window.opener.document.getElementById("themefontsizechangertb-fontcolor-custom-menuitem").setAttribute("value",picker.color);
	//window.opener.document.getElementById("tfsc-color").selectedItem=window.opener.document.getElementById("themefontsizechangertb-fontcolor-custom-menuitem");
	//window.opener.document.getElementById("tfsc-color").value=picker.color;	
	//window.opener.document.getElementById("tfsc-color").style.background=picker.color;
	window.opener.ThemeFontSizeChanger.handleColorPick(picker.color); 				
    if (picker.askColorPickerElementValue()=="color") window.opener.ThemeFontSizeChanger.changeFontSize(); 
    else if (picker.askColorPickerElementValue()=="backgroundcolor") window.opener.ThemeFontSizeChanger.changeTheme(picker.color);
    else if (picker.askColorPickerElementValue()=="threadpanebackgroundcolor") window.opener.ThemeFontSizeChanger.changeFontSize();
	
  },

  inspectGrad : function(x, y) {
    var pixsel = themefontsizechangertbrainbowc.get("pix-sel");
    pixsel.style.left = x - pixsel.width / 2 + 1 + "px";
    pixsel.style.top = y - pixsel.width / 2 + 1 + "px";

    var color = picker.getInspectedColor();
    pixsel.src = colorCommon.blackText(color) ? "chrome://themefontsizechangertb/skin/box_thin.png"
                                              : "chrome://themefontsizechangertb/skin/box_thin_white.png"; 

    var vals = colorCommon.hsvValues(color);
    switch(picker.mode) {
      case 'sat':
        var barColor = colorCommon.hsvString(vals['hue'], '100', vals['val']);
        themefontsizechangertbrainbowc.get("bar").style.backgroundColor = 
                colorCommon.toHex(colorCommon.hsvString(vals['hue'], '100', '100'));
        themefontsizechangertbrainbowc.get("top-bar").style.opacity = 1 - vals['val'] / 100;
        break;
      case 'val':
        var barColor = colorCommon.hsvString(vals['hue'], vals['satv'], '100');
        themefontsizechangertbrainbowc.get("bar").style.backgroundColor = colorCommon.toHex(barColor);
        break;
      default:
        break;
    }
  },

  barClick : function (event) {
    var parent = themefontsizechangertbrainbowc.get("bar-display");
    var y = event.clientY - parent.boxObject.y;
    picker.inspectBar(y);
    var newColor = picker.getInspectedColor();
    picker.visitColor(newColor, true);
  },
  
  inspectBar : function(z) {
    var barsel = themefontsizechangertbrainbowc.get("bar-sel");
    barsel.style.top = z - barsel.height / 2 + 1 + "px";
     
    switch(picker.mode) {
      case 'hue':
        var hue = Math.round((255 - z) / 255 * 360);
        themefontsizechangertbrainbowc.get("bottom-gradient").style.backgroundColor 
                  = colorCommon.hslString(hue,100,50);
        picker.hue = hue;
        break;
      case 'sat':
        var sat = Math.round((255 - z)/255 * 1000)/10;
        themefontsizechangertbrainbowc.get("top-gradient").style.opacity = 1 - sat/100;
        picker.sat = sat;
        break;
      case 'val':
        var val = Math.round((255 - z)/255 * 1000)/10;
        themefontsizechangertbrainbowc.get("top-gradient").style.opacity = 1 - val/100;
        picker.val = val;
        break;
      default:
        break;
    }
  },

  getInspectedColor : function() {    
    var h, s, v;
    var pixsel = themefontsizechangertbrainbowc.get("pix-sel");
    var pixParent = themefontsizechangertbrainbowc.get("gradient-display");
    var x = pixsel.getBoundingClientRect().left - pixParent.boxObject.x 
            + pixsel.width / 2;
    var y = pixsel.getBoundingClientRect().top - pixParent.boxObject.y 
            + pixsel.height / 2;

    var barsel = themefontsizechangertbrainbowc.get("bar-sel");
    var barParent = themefontsizechangertbrainbowc.get("bar-display");
    var z = barsel.getBoundingClientRect().top - barParent.boxObject.y
            + barsel.height / 2;

    switch(picker.mode) {
      case 'hue':
        h = Math.round((255 - z) / 255 * 360); // crazy hard coding
        s = Math.round(x / 255 * 1000) / 10;
        v = Math.round((255 - y) / 255 * 1000) / 10;
        break;
      case 'sat':
        h = Math.round(x / 255 * 360);
        s = Math.round((255 - z) / 255 * 1000) / 10;
        v = Math.round((255 - y) / 255 * 1000) / 10;
        break;
      case 'val':
        h = Math.round(x / 255 * 360);
        s = Math.round((255 - y) / 255 * 1000) / 10;
        v = Math.round((255 - z) / 255 * 1000) / 10;
        break;
      default:
        throw 'Rainbow: no mode set in picker';
        break;
    }
    var h = Math.min(360, Math.max(0, h));
    var s = Math.min(100, Math.max(0, s));
    var v = Math.min(100, Math.max(0, v));
    return colorCommon.hsvString(h, s, v);
  },

  selectDisplay : function(display, event) {
    picker.displayElem.className = "";
    picker.displayElem = display;
    display.className = picker.highlightClass;
    
    if(picker.displayElem.id == "display-text") {
      var color = display.style.color;
      var bg = themefontsizechangertbrainbowc.get("display-color-1").style.backgroundColor;
      if(!colorCommon.blackText(bg))
        display.className = "highlight-light";
      else
        display.className = "highlight";
    }
    else
      var color = display.style.backgroundColor;
    picker.visitColor(color, true, false);
    picker.inspectColor(color);

    if(event)
      event.stopPropagation();
  },

  elementDisplay : function(bg, txt, font) {
    var d1 = themefontsizechangertbrainbowc.get("display-color-1");
    var d2 = themefontsizechangertbrainbowc.get("display-color-2");
    var fontDisplay = themefontsizechangertbrainbowc.get("display-text");

    d2.hidden = true;
    d1.style.backgroundColor = bg;      
    if(txt) {
      fontDisplay.style.color = txt;
      fontDisplay.hidden = false;
      while(fontDisplay.firstChild)
        fontDisplay.removeChild(fontDisplay.firstChild);
      var lines = getLines(font, 100);
      for(var i = 0; i < lines.length; i++) {
        var label = document.createElement("label");
        label.setAttribute("value", lines[i]);
        fontDisplay.appendChild(label);
      }
    }
    else
      fontDisplay.style.color = "";

    picker.displayElem = d1;
    picker.selectDisplay(d1);

    picker.displayContrast();
  },

  comparisonDisplay : function(color1, color2) {
    var d1 = themefontsizechangertbrainbowc.get("display-color-1");
    var d2 = themefontsizechangertbrainbowc.get("display-color-2");

    if(color1 && color2) {
      d1.style.backgroundColor = color1;
      d2.style.backgroundColor = color2;
    }
    else
      d2.style.backgroundColor = d1.style.backgroundColor;

    d2.hidden = false;
    picker.displayElem = d1;
    picker.selectDisplay(d1);

    d1.ondblclick = picker.singleDisplay;
    d2.ondblclick = picker.singleDisplay;
  },

  singleDisplay : function() {
    var d1 = themefontsizechangertbrainbowc.get("display-color-1");
    var d2 = themefontsizechangertbrainbowc.get("display-color-2");

    if(picker.displayElem.id == "display-text")
      d1.style.backgroundColor = picker.displayElem.style.color;
    else
      d1.style.backgroundColor = picker.displayElem.style.backgroundColor;

    picker.selectDisplay(d1);
    d1.className = "highlight"; // show grey for dark and light themes
    d2.hidden = true;
    d1.ondblclick = picker.comparisonDisplay;
    d2.ondblclick = picker.comparisonDisplay;

    themefontsizechangertbrainbowc.get("display-text").hidden = true;
    themefontsizechangertbrainbowc.get("selector-element").value = " ";
    themefontsizechangertbrainbowc.get("contrast").value = "";
  },

  cloneDisplay : function(event) {
    var display = event.target;
    var color = event.dataTransfer.getData("text/themefontsizechangertbrainbow-color");
    if(colorCommon.isValid(color)) {
      display.style.backgroundColor = color;
      if(picker.displayElem == display) {
        picker.visitColor(color, true, false);
        picker.inspectColor(color);
      }
    }
  },
  
  copy : function() {
    themefontsizechangertbrainbowc.copyColor(picker.color);
  },

  bookmark : function() {
    var button = themefontsizechangertbrainbowc.get("bookmark-button");
    window.openDialog("chrome://themefontsizechangertb/content/editBookmark.xul",
                  "Window:EditColor", "all,dialog=yes,resizable=no, centerscreen",
                  {colors: [picker.color], button: button, url: picker.url} );
  },

  dragStart : function(event) {
    event.dataTransfer.setData("text/themefontsizechangertbrainbow-color", event.target.style.backgroundColor);
    event.dataTransfer.setData("text/themefontsizechangertbrainbow-source", "picker");
  },
};



