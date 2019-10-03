
var MyColorPicker= function() {

// list taken from FirePalette (http://blog.endflow.net/?p=143)
var colorNames = {
  aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "00ffff",
  aquamarine: "7fffd4", azure: "f0ffff", beige: "f5f5dc",
  bisque: "ffe4c4", black: "000000", blanchedalmond: "ffebcd",
  blue: "0000ff", blueviolet: "8a2be2", brown: "a52a2a",
  burlywood: "deb887", cadetblue: "5f9ea0", chartreuse: "7fff00",
  chocolate: "d2691e", coral: "ff7f50", cornflowerblue: "6495ed",
  cornsilk: "fff8dc", crimson: "dc143c", cyan: "00ffff",
  darkblue: "00008b", darkcyan: "008b8b", darkgoldenrod: "b8860b",
  darkgray: "a9a9a9", darkgreen: "006400", darkkhaki: "bdb76b",
  darkmagenta: "8b008b", darkolivegreen: "556b2f", darkorange: "ff8c00",
  darkorchid: "9932cc", darkred: "8b0000", darksalmon: "e9967a",
  darkseagreen: "8fbc8f", darkslateblue: "483d8b", darkslategray: "2f4f4f",
  darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493",
  deepskyblue: "00bfff", dimgray: "696969", dodgerblue: "1e90ff",
  feldspar: "d19275", firebrick: "b22222", floralwhite: "fffaf0",
  forestgreen: "228b22", fuchsia: "ff00ff", gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520",
  gray: "808080", green: "008000", greenyellow: "adff2f",
  honeydew: "f0fff0", hotpink: "ff69b4", indianred : "cd5c5c",
  indigo : "4b0082", ivory: "fffff0", khaki: "f0e68c",
  lavender: "e6e6fa", lavenderblush: "fff0f5", lawngreen: "7cfc00",
  lemonchiffon: "fffacd", lightblue: "add8e6", lightcoral: "f08080",
  lightcyan: "e0ffff", lightgoldenrodyellow: "fafad2", lightgrey: "d3d3d3",
  lightgreen: "90ee90", lightpink: "ffb6c1", lightsalmon: "ffa07a",
  lightseagreen: "20b2aa", lightskyblue: "87cefa", lightslateblue: "8470ff",
  lightslategray: "778899", lightsteelblue: "b0c4de", lightyellow: "ffffe0",
  lime: "00ff00", limegreen: "32cd32", linen: "faf0e6",
  magenta: "ff00ff", maroon: "800000", mediumaquamarine: "66cdaa",
  mediumblue: "0000cd", mediumorchid: "ba55d3", mediumpurple: "9370d8",
  mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970",
  mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5",
  navajowhite: "ffdead", navy: "000080", oldlace: "fdf5e6",
  olive: "808000", olivedrab: "6b8e23", orange: "ffa500",
  orangered: "ff4500", orchid: "da70d6", palegoldenrod: "eee8aa",
  palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "d87093",
  papayawhip: "ffefd5", peachpuff: "ffdab9", peru: "cd853f",
  pink: "ffc0cb", plum: "dda0dd", powderblue: "b0e0e6",
  purple: "800080", red: "ff0000", rosybrown: "bc8f8f",
  royalblue: "4169e1", saddlebrown: "8b4513", salmon: "fa8072",
  sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee",
  sienna: "a0522d", silver: "c0c0c0", skyblue: "87ceeb",
  slateblue: "6a5acd", slategray: "708090", snow: "fffafa",
  springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c",
  teal: "008080", thistle: "d8bfd8", tomato: "ff6347",
  turquoise: "40e0d0", violet: "ee82ee", violetred: "d02090",
  wheat: "f5deb3", white: "ffffff", whitesmoke: "f5f5f5",
  yellow: "ffff00", yellowgreen: "9acd32"
};


// taken from Firebug | cssPanel.js
var reSplitCSS = /(url\("?[^"\)]+?"?\))|(rgba?\(.*?\))|(hsla?\(.*?\))|(#[\dA-Fa-f]+)|(-?\d+(\.\d+)?(%|[a-z]{1,4})?)|([^,\s\/!\(\)]+)|"(.*?)"|(!(.*)?)/;

function parseCSSValue(value, offset) {
  var start = 0;
  var m= undefined;
  while (1)
  {
    m = reSplitCSS.exec(value);
    if (m && m.index+m[0].length < offset)
    {
      value = value.substr(m.index+m[0].length);
      start += m.index+m[0].length;
      offset -= m.index+m[0].length;
    }
    else
    break;
  }

  if (m)
  {
    var type= undefined;
    if (m[1])
    type = "url";
    else if (m[2] || m[3] || m[4])
    type = "rgb";
    else if (m[5])
    type = "int";

    return {value: m[0], start: start+m.index, end: start+m.index+(m[0].length-1), type: type};
  }
  return undefined;
}
// end of firebug helpers

var splitCSSValues = function(cssValue) {
  var offset = 0, cssValues = [], /* cssValueLength = cssValue.length, */ nextValue = parseCSSValue(cssValue, offset), previousValue;
  while (nextValue) {
    cssValues.push(nextValue);
    offset        = nextValue.end + 1;
    previousValue = nextValue;
    while ((nextValue = parseCSSValue(cssValue, offset)) && nextValue.start == previousValue.start) { offset++; }
  }
  return cssValues;
};

var Color = function(r, g, b, a) {
  this.r = r || 0;
  this.g = g || 0;
  this.b = b || 0;
  this.a = undefined == a ? 1 : a;
};

Color.prototype = {
  toString: function() {
    return this.a < 1 ? this.toRGBAString() : this.toHEXString();
  },
  
  toRGBAString: function() {
    return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
  },
  
  toHEXString: function() {
    // taken from firebug
    return '#' + ((1 << 24) + (this.r << 16) + (this.g << 8) + (this.b << 0)).toString(16).substr(-6).toUpperCase();
  }
};

var ColorValue = function(cssValueObj, translation) {
  this.value       = cssValueObj.value;
  this.translation = translation;
  this.start       = cssValueObj.start;
  this.end         = cssValueObj.end;
};

ColorValue.prototype = {
  rgbSplitter: /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*([\d.]+))?\s*\)$/i,
  hexColor: /^#([\da-f]{3}|[\da-f]{6})$/i,
  noColor: new Color(),
  
  /*
  preparePrefixSuffix: function(wholeCssValue) {
    this.prefix = wholeCssValue.substring(0, this.start);
    this.suffix = wholeCssValue.substring(this.end + 1);
  },
  
  toNewWholeCssValue: function(newColorString) {
    return this.prefix + newColorString + this.suffix;
  },
  */
  
  toRGB: function() {
    var hexValue = this.tryToGrabHexColorString();
    return (hexValue ? this.hex2RGB(hexValue) : this.parseRGBString()) || this.noColor;
  },
  
  tryToGrabHexColorString: function() {
    var match;
    return this.translation || ((match = this.value.match(this.hexColor)) && match[1]);
  },
  
  parseRGBString: function(rgbString) {
    var match = this.value.match(this.rgbSplitter);
    if (match) {
      return new Color(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), match[4]);
    }
    return undefined;
  },
  
  hex2RGB: function(hex) {
    if (hex.length == 3) { hex = hex.replace(/(.)/g, '$1$1'); }
    var val = parseInt(hex, 16);
    return new Color((val & 0xFF0000) >> 16, (val & 0xFF00) >> 8, val & 0xFF);
  }
};

ColorValue.newIfColor = function(cssValue) {
  var hexTranslation= undefined;
  if (cssValue.type == 'rgb' || (hexTranslation = colorNames[cssValue.value.toLowerCase()])) {
    return new ColorValue(cssValue, hexTranslation);
  }
  return undefined;
};

var ColorsDropDown = function(editor, firepicker) {
  this.editor     = editor;
  this.firepicker = firepicker;
};

ColorsDropDown.prototype = {

  /*
  tags: domplate({
    container: DIV({'class': 'firepicker_color_container'}),
    valueCell: DIV({'class': 'color_value', style: 'background-color: $color;'},
      DIV({'class': 'css_text'}, '$color')
    )
  }),
  */
		
	/*
  	tags: ({
	    container:  document.getElementById("id__firepicker_color_container"),
//	    	DIV({'class': 'firepicker_color_container'}),
	    valueCell:  document.getElementById("id__color_value"),
//	    	DIV({'class': 'color_value', style: 'background-color: $color;'},
//	      		DIV({'class': 'css_text'}, '$color')
//	    	)
  	}),
	*/
  
  /*
  editorShown: function() {
    this.onValueChange();
    this.attachInputChangeHandler();
  },
  
  attachInputChangeHandler: function() {
    if (!this.boundOnValueChange) { this.boundOnValueChange = bind(this.onValueChange, this); }
    this.editor.input.addEventListener('input' , this.boundOnValueChange, false); //'input' no anda vd?
    this.editor.input.addEventListener('change', this.boundOnValueChange, false);
    this.editor.input.addEventListener('click' , this.boundOnValueChange, false);
  },
  */
  
  /*
  //parentDiv.insertBefore(sp1, sp2.nextSibling);
  getListContainer: function __getListContainer() {
    if (!this.listContainer) { 
    	//is.listContainer = this.tags.container.insertAfter({}, this.getContainerInsertionPoint());
    	
    	this.listContainer = this.tags.container.parentNode.insertBefore(this.tags.container, this.getContainerInsertionPoint().nextSibling);
    }
    this.addStylesheet(this.getHTMLRootOf(this.editor.box));
    return this.listContainer;
  },
  
  getContainerInsertionPoint: function  __getContainerInsertionPoint() {
	    //return this.editor.box.getElementsByTagName('input')[0];
	    return this.editor.input;
  },
  
  getHTMLRootOf: function(element) {
    while (element.tagName != 'HTML' && element.parentNode) { element = element.parentNode; }
    return element;
  },
  
  addStylesheet: function(htmlRoot) {
    if (!htmlRoot._withFirepickerDropDownStylesheet) {
      //var styleSheet = createStyleSheet(htmlRoot.ownerDocument, '../skin/css-attribute-dialog.css');
      var head       = htmlRoot.getElementsByTagName('head')[0];
      //head.appendChild(styleSheet);
      htmlRoot._withFirepickerDropDownStylesheet = true;
    }
  },
  */
  
  
  /*
  onValueChange: function __onValueChange() {
    this.updateList(this.getCSSColorValues());
  },
  
  getCSSColorValues: function() {
    return this.filterColorValues(splitCSSValues(this.editor.input.value));
  },
  */
		
  filterColorValues: function(cssValues) {
    var colorValues = [], colorValue;
    for (var i = 0, len = cssValues.length; i < len; i++) {
      if ( (colorValue = ColorValue.newIfColor(cssValues[i])) ) { colorValues.push(colorValue); }
    }
    return colorValues;
  },
  
  /*
  updateList: function __updateList(colorValues) {
    //var container = this.getListContainer();
    //eraseNode(container);
    for (var i = 0, len = colorValues.length; i < len; i++) { this.addColorCell( colorValues[i]); } //container,
    //container.style.display = colorValues.length == 0 ? 'none' : 'block';
  },
  
  addColorCell: function( colorValue) { //container,
	  //r newCell = this.tags.valueCell.append({color: colorValue.value}, container);
	  var newCell = this.tags.valueCell;
	  newCell.textContent= ("YYY   "+colorValue.value);
	  newCell.colorValue = colorValue;
	  newCell.dropDown   = this;
	  newCell.addEventListener('mousedown', this.cellMousedown, false);
  },
  */
  
  get_Valid_ColorValue: function( str_value ){
	  
	  var colorValues= undefined;
	  try {
		  colorValues= this.filterColorValues(splitCSSValues( str_value ));
	  } catch (ex) {
		  HCPlusLib.myDumpToConsole("  get_Valid_ColorValue(), ignoring error:  " + ex);
	  }
		  
	  var colorValue = undefined;

	  if( colorValues ){
		  if( colorValues.length > 0 ){
			  colorValue = colorValues[0];
		  }else{ //length == 0
			  HCPlusLib.myDumpToConsole("  colorValues.length= " + colorValues.length);
		  }
	  }
	  
	  if( colorValue === undefined ){
		  colorValue = this.filterColorValues(splitCSSValues("rgb(128,128,128)"))[0];
	  }

	  return colorValue;
  },

  registerTargetControl: function( _elem ) { //newCell is my target element in option-dialog 
	  //FMI (For My Information :) -> addColorCell() is different, It CREATES this control from css values in Firebug right?

	  HCPlusLib.myDumpToConsole("registerTargetControl()  Begin: ");

	  if( !_elem ){
		    
			HCPlusLib.myDumpToConsole("registerTargetControl(), ignoring error: elem is "+_elem); //TODO: no aparece este msg ??
			return;
	  }
	  if( _elem.dropDown ){
			HCPlusLib.myDumpToConsole("registerTargetControl(), ignoring error: already called for this elem: "+_elem.id); //TODO: no aparece este msg!
			return;
	  }
	  
	  //HCPlusLib.debugError("registerTargetControl(),  DUMMY ERRROR for Test !  id= "+_elem.id);
	  
	  //TODO:  BEWARE of using "_elem" inside callbacks!!!!
	  
	  if(       _elem.localName == "textbox" ){
		  _elem.myCallback= function( bSet, _self, newColorString){
			  if(bSet){ //write color
				  /**/   _self.inputField.value      = ""+newColorString;
		          setTimeout(function(){
		  	        //_self._fireChange();
		      	    var evt = document.createEvent("Events");
		  			evt.initEvent("change", true, true);
		  			_self.dispatchEvent(evt);
		  		  }, 1 );

			  }else{    //read color
				  return _self.inputField.value;
			  }
			  return undefined;
		  };
	  }else if( _elem.localName == "hbox"    ){
		  _elem.myCallback= function( bSet, _self, newColorString){
			  if(bSet){ //write color
				  /**/   _self.textContent= ""+newColorString;
				  //Warning: XUL box for hbox element contained an inline #text child, forcing all its children to be wrapped in a block.
			  }else{    //read color
				  return _self.textContent;
			  }
			  return undefined;
		  };
	  }else if( _elem.localName == "label"    ){
		  _elem.myCallback= function( bSet, _self, newColorString){
			  if(bSet){ //write color
				  /**/   _self.value      = ""+newColorString;
			  }else{    //read color
				  return _self.value;
			  }
			  return undefined;
		  };
	  }else if( _elem.localName == "colorpickplus"  ){ // _elem.mColorBox -> <COLORPICKPLUS>   // TODO: revisar si tiene this.localName == "colorpickplus" 
		  _elem.myCallback= function( bSet, _self, newColorString){
			  if(bSet){ //write color
				  /**/   _self.color      = ""+newColorString;
			  }else{    //read color
				  return _self.color;
			  }
			  return undefined;
		  };
	  }else{
		  throw new Error("registerTargetControl() Not implemeted yet for: " + _elem.localName);
	  }

	  
	  
	  _elem.dropDown   = this;
	  _elem.addEventListener('mousedown', this.cellMousedown, false);
  },


  cellMousedown: function(e) {
	  
	if( this.disabled === true ){
		return;
	}
	  
    //cancelEvent(e);

	//HCPlusLib.myDumpToConsole("mousedown  this: "+this.id);
	  
    var input           = this.dropDown.editor.input,
        xul_colorpicker = this.dropDown.editor.xul_colorpicker,
        input_typeColor = this.dropDown.editor.input_typeColor,
        _self           = this,
        style           = this.style; 
    
    
    //only set this.colorValue right before openPopup()! 
    this.colorValue = _self.dropDown.get_Valid_ColorValue( _self.myCallback( false, _self ) );

    /* now initPopup...()  calls the callback 1 time!!
    var color = this.colorValue;
    input.value           = color.value;
    xul_colorpicker.color = color.value;
    //color.preparePrefixSuffix(input.value); // throws error if value is empty ....
    
    //this.dropDown.editor.box.focus(); --> esto en popupshown
    */
    
    this.dropDown.openPopup(this, function(newRGB) { // this is the callback
    	try {
    		var newColorString    = newRGB.toString();
    		
    		input.value           = newColorString; //color.toNewWholeCssValue(newColorString); // DONT use prefix and suffix 
    	    xul_colorpicker.color = newColorString;

    	    if( input_typeColor ){
        	    input_typeColor.value = newColorString;
    	    }
    	    
    		style.backgroundColor = newColorString;

    		_self.myCallback( true, _self, newColorString );

    		//only needed right before calling openPopup() --- 
    		//_self.colorValue = _self.dropDown.get_Valid_ColorValue( newColorString );

    		//Firebug.Editor.update(true);
    		
    	} catch (ex) {
    		  HCPlusLib.myDumpToConsole("Ignoring Error in colorpicker callback(): " + ex);
    		  //PlusLib.debugError     ("Ignoring Error in colorpicker callback(): ", ex);
    	}
    });
  },
  
  openPopup: function __openPopup(colorCell, callback) {

	dump_args(this, arguments);

    this.firepicker.openPopup(this.editor, colorCell, colorCell.colorValue.toRGB(), callback);
  }
};

var Popup = function() {};

Popup.prototype = {
  getPanel: function() {
    if (!this.panel) { this.panel = new this.PickerPanel(); }
    return this.panel;
  },
  
  open: function __open(editor, colorCell, color, callback) {
		
	dump_args(this, arguments);
		
    var panel = this.getPanel();
    panel.preopenCheck();
    
    //var position = this.computePosition(colorCell, this.getCssWrapperHeight(editor), panel.getBrowser());
    var options = {editor: editor, color: color, callback: callback};

    panel.openPopup(options, colorCell, 'start_after', 0, 0, false, false); //overlap //position.x, position.y
  },
  
  getCssWrapperHeight: function(editor) {
    return editor.input.ownerDocument.documentElement.clientHeight;
  },
  
  aggregateScrollOffsetTop: function(element) {
    //var offset = 0;
    //while ( (element = getOverflowParent(element)) ) { offset += element.scrollTop; }
    //return offset;
    return 50;
  },
  
  computePosition: function(colorCell, cssWrapperHeight, browser) {
    var clientOffset                 = {y:50}, //getClientOffset(colorCell),
        popUpHeight                  = browser.getAttribute('height'),
        scrollOffsetTop              = this.aggregateScrollOffsetTop(colorCell),
        toCellFromWrapperTopBorder   = clientOffset.y - scrollOffsetTop,
        idealPopupShiftUp            = (popUpHeight - colorCell.clientHeight) / 2,
        distanceToBottomScreenBorder = cssWrapperHeight - toCellFromWrapperTopBorder - (colorCell.clientHeight / 2),
        outOfScreenHeight            = Math.max(0, (popUpHeight / 2) - distanceToBottomScreenBorder);
    
    return {x: colorCell.clientWidth - 5, y: -Math.max(idealPopupShiftUp, idealPopupShiftUp + outOfScreenHeight)};
  }
};

Popup.prototype.PickerPanel = function() {
  var boundCallbacks = {};
  this.forEachCallback(function(callbackName, callback) {
    boundCallbacks[callbackName] = bind(callback, this);
  });
  this.callbacks = boundCallbacks;
};

Popup.prototype.PickerPanel.prototype = {
  getElement: function() {
    if (!this.element) { this.setElement(this.queryForElement()); }
    return this.element;
  },
  
  
  element: undefined, // avoid jconsole warnings
  
  setElement: function(element) {
    if (this.element) { this.detachFromCurrentElement(); }
    element.wrapper = this;
    this.element = element;
    this.setupPopup();
    this.toggleCallbacks(true);
  },
  
  setupPopup: function() {
    this.getBrowser().contentDocument.expose({
      globalDocument: pickerObj_local.getCurrentDocument(),
      bind: bind,
      Color: Color
    });
  },
  
  detachFromCurrentElement: function() {
    delete this.element.wrapper;
    this.toggleCallbacks(false);
    delete this.browser;
  },
  
  preopenCheck: function() {
    var freshResult = this.queryForElement();
    if (this.element != freshResult) { this.setElement(freshResult); }
  },
  
  queryForElement: function() {
    return pickerObj_local.$('hctp-fp-panel');
  },
  
  getBrowser: function() {
    if (!this.browser) { this.browser = this.getElement().getElementsByTagName('browser')[0]; }
    return this.browser;
  },
  
  openPopup: function  __openPopup(options) {

	dump_args(this, arguments);
	  
	var myAttrs= {hide_opacity: ""+arguments[1].getAttribute("hide_opacity")};
	this.getBrowser().contentDocument.do_setMyOptions( myAttrs,	null );
	
	//HCPlusLib.myDumpToConsole( "openPopup (final?) called! my_hide_opacity= "+myAttrs.hide_opacity );
	//HCPlusLib.myDumpToConsole( "openPopup (final?) called!  arguments= "+ arguments[1].id );
	
	var this_getElement= this.getElement();
	var f_arguments    = arguments;
	
	this_getElement.setAttribute("hide_opacity", myAttrs.hide_opacity);
	
    this.options = options;

    //var delay= 10;
    if( this_getElement.state == "open" ){
    	//delay= 500;
    	this_getElement.hidePopup();
    	return;
    }else{
        //2014-05: it doesnt open 'well' (with correct focus) after hiding here .....
        //setTimeout(function() {
    	//}, delay);
       	this_getElement.openPopup.apply(this_getElement, Array.slice(f_arguments, 1));
    }
  },
  
  toggleCallbacks: function(doAdd) {
    this.forEachCallback(function(callbackName, callback) {
      this.getElement()[doAdd ? 'addEventListener' : 'removeEventListener'](callbackName, callback, false);
    });
  },
  
  forEachCallback: function(fun) {
    for (var callbackName in this.callbacks) {
      fun.call(this, callbackName, this.callbacks[callbackName]);
    }
  },
  
  callbacks: { // these will be bound and executed in the PickerPanel's context
    popuphidden: function(_event) {
		//HCPlusLib.myDumpToConsole( "popuphidden ... -> t.id= "+_event.target.id );
		if( _event.target != this.getElement() ){ // internal xul-colorpicker and input-context-menu fires "popuphidden" and the other popup-events too!!
			return;
		}

      if (this.options) {
        var editor = this.options.editor;
        
        //editor.colorsDropDown.onValueChange();
        this.getBrowser().contentDocument.popUpClosed();

        // this has to run through setTimout because FF runs the blur event on editor after this callback
        setTimeout(function(){ editor.colorPickerClosed(); }, 0);
        delete this.options;
      }
    },
    
    popuphiding: function(_event) {
		//HCPlusLib.myDumpToConsole( "popuphiding ... -> t.id= "+_event.target.id );
		if( _event.target != this.getElement() ){
			return;
		}
		
		if (this.options) { this.options.editor.closingColorPicker(); }
    },
    
    popupshown: function(_event) {
		//HCPlusLib.myDumpToConsole( "popupshown ... -> t.id= "+_event.target.id );
		if( _event.target != this.getElement() ){
			return;
		}
		
      if (this.options) { 
    	  this.getBrowser().contentDocument.initColorPicker(this.options.color, this.options.callback);
    	  
    	  //focus <input>
    	  var _self= this;
    	  setTimeout( function(){
    		  _self.options.editor.box.focus();
    	  }, 30);
      }
    }
  },
  
  re_initColorPicker: function( _color ) {
	  
		//HCPlusLib.myDumpToConsole( "re_initColorPicker  color    = "+_color+ "   - this.options= " + this.options );  

      if (this.options) { 
		  this.options.color= _color;
		  this.getBrowser().contentDocument.do_setColor(this.options.color);
      }
  },

};


var FirepickerModel= function(){
};
FirepickerModel.prototype = {
  ColorsDropDown: ColorsDropDown,
  Popup: Popup,
  ColorValue: ColorValue,
  colorNames: colorNames,
  
  enable: function() {
    if (!this.initialized) { this.initialize(); }
  },

  initialize: function() {
    
	//this.hookIntoCSSPanel('css');  // FIREBUG panels ...
    //this.hookIntoCSSPanel('stylesheet');
	this.hookIntoCSSEditor(this.editor);

	
	//NEW XUL_COLORPICKER (nice color palette)
	this.editor.xul_colorpicker.addEventListener('change', function(){
		//this.color; //this == elem-with-listener

		var _colValue= pickerObj_local.editor.colorsDropDown.get_Valid_ColorValue( this.color );

		//HCPlusLib.myDumpToConsole( "xul_colorpicker color    = "+this.color );  
		
		pickerObj_local.colorPickerPopup.getPanel().re_initColorPicker( _colValue.toRGB() );
		
	}, false);

	//NEW HTML input type color (since Fx29!) (NICER color palette) (why doesn't have opacity??)
	if( this.editor.input_typeColor ){
		this.editor.input_typeColor.addEventListener('change', function(){
			//this == elem-with-listener

			//alert('from js:   color= '+this.value);

			var _colValue= pickerObj_local.editor.colorsDropDown.get_Valid_ColorValue( this.value );

			pickerObj_local.colorPickerPopup.getPanel().re_initColorPicker( _colValue.toRGB() );

		}, false);
	}


	this.editor.box.addEventListener('change', function(){ //keypress
		//this.color; //this == elem-with-listener

		var _colValue= pickerObj_local.editor.colorsDropDown.get_Valid_ColorValue( this.value );

		//HCPlusLib.myDumpToConsole( "xul_colorpicker color    = "+this.color );  
		
		pickerObj_local.colorPickerPopup.getPanel().re_initColorPicker( _colValue.toRGB() );
		
	}, false);

	
    this.initialized = true;
  },
  
  editorExtensions: {
    closingColorPicker: function() {
      // prevent Firebug from closing the editor in FF 3.7+ (the editor gets blur event even though the panel has noautofocus="true")
      this._enterOnBlurWas = this.enterOnBlur;
      this.enterOnBlur     = false;
    },
    
    colorPickerClosed: function() {
      this.enterOnBlur = this._enterOnBlurWas;
      this.input.focus();
    }
  },
  
  hookIntoCSSEditor: function(editor) {
    if (!editor.colorsDropDown) {
      //var originalShow = editor.show, self = this;

      editor.colorsDropDown = new ColorsDropDown(editor, this);
      
      /*
      editor.show = function() {
        var result = originalShow.apply(this, arguments);
        this.colorsDropDown.editorShown();
        return result;
      };
      */
      
      editor.closingColorPicker = this.editorExtensions.closingColorPicker;
      editor.colorPickerClosed  = this.editorExtensions.colorPickerClosed;
    }
  },
  
  /*
  hookIntoCSSPanel: function(type) {
    var self = this, stylesheetPanelPrototype = Firebug.getPanelType(type).prototype, original = stylesheetPanelPrototype.getEditor;
    stylesheetPanelPrototype.getEditor = function() {
      var result = original.apply(this, arguments);
      if (this.editor) { self.hookIntoCSSEditor(this.editor); }
      return result;
    }
  },
  */
  
  openPopup: function __openPopup(editor, colorCell, color, callback) {
	  
	dump_args(this, arguments);
		
    if (!this.colorPickerPopup) { this.colorPickerPopup = new Popup(); }
    this.colorPickerPopup.open(editor, colorCell, color, callback);
  },
  
  getCurrentDocument: function() {
    // doing the simple return document; doesn't get the right thing when FB is in detached mode
	    //return Firebug.currentContext.chrome.window.document;
    return window.document;
  },
  
  $: function(id) {
    // doing Firebug.chrome.$(id) might use the incorrect document in the detached mode
	return $(id, this.getCurrentDocument());
  },
  
  log: function() {
    for (var len = arguments.length, i = 0; i < len; i++) {
      Firebug.Console.log(arguments[i]);
    }
  }
};


function bind(func, _this) {
	return func.bind(_this);
}
function $(id, document) {
	return document.getElementById(id);
}


//Firebug.registerModule(Firebug.FirepickerModel);

//I run again these manually to test!!!! 

this.pickerObj= new FirepickerModel();

var pickerObj_local= this.pickerObj;

this.pickerObj.editor= {
	input: 			 pickerObj_local.$("hctp-fp-panel_css_color").inputField,
	
	box:   			 pickerObj_local.$("hctp-fp-panel_css_color"),
	
	xul_colorpicker: pickerObj_local.$("hctp-fp-panel_colorpicker"),

	input_typeColor: pickerObj_local.$("hctp-fp-panel_inputTypeColor"),
	
	dummy: null
};

this.pickerObj.enable();



this.registerElem= function ( _elem ){
	this.pickerObj.editor.colorsDropDown.registerTargetControl( _elem );
};

/*
xxx.pickerObj.openPopup(editor, colorCell, color, callback);
*/


}; // MyColorPicker end


function dump_args( _self, the_arguments){
	/*
	var func_headertxt=  ""+the_arguments.callee;
	func_headertxt= func_headertxt.substring(0, func_headertxt.indexOf("{"));
	HCPlusLib.myDumpToConsole(  
			" this= "+ _self + 
			"  \n  "+ func_headertxt +
			"  \n    "+  HCPlusLib.objToString(the_arguments) +
			"  \n    name= "    +the_arguments.callee.name    );
	*/
}




var pickerModule;
setTimeout(function(){
	
	try {
		pickerModule= new MyColorPicker();

		
		//-----------------------------------------------------------------
		/*
		colorsDropDown.onValueChange()
			
		ColorValue.parseRGBString(xx);
		
		pickerModule.pickerObj.editor.colorsDropDown.tags.xx;

		*/

		//CALL THIS to prepare to OPEN POPUP on mousedown
		// pickerModule.pickerObj.editor.colorsDropDown.onValueChange();

		/* pongo estos tests directo en OPTIONS.XUL !
		 *
		pickerModule.registerElem( document.getElementById("id__color_value"  ) );
		pickerModule.registerElem( document.getElementById("id__color_value_2") );
		pickerModule.registerElem( document.getElementById("id__color_value_3") );

		//ckerModule.registerElem( document.getElementById("id__color_value_4") ); // ya tiene init() propio con el XBL-BINDING !

		//REPETIDO !!!!
		pickerModule.registerElem( document.getElementById("id__color_value_2") );
		 */
		
	} catch (ex) {
		HCPlusLib.debugError("General Error on new colorpicker():  ", ex);
	}
	
}, 10);


