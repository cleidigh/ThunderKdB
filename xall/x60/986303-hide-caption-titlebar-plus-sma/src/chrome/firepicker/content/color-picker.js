var cumulativeOffset = function(element) {
  var top = 0, left = 0;
  do {
    top  += element.offsetTop  || 0;
    left += element.offsetLeft || 0;
  } while ( (element = element.offsetParent) );
  return {left: left, top: top};
};

var stopEvent = function(e) {
  e.preventDefault();
  e.stopPropagation();
};

var ColorConverter = {
  HSV2RGB: function(h, s, v, a) {
    if (h + 0.0000000001 >= 1) {h = 0;}
    h *= 6;

    var i = parseInt(h, 10),
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - s * f),
        t = v * (1 - s * (1 - f)),
        r=0, g=0, b=0;

    switch (i) {
        case 0: r=v; g=t; b=p; break;
        case 1: r=q; g=v; b=p; break;
        case 2: r=p; g=v; b=t; break;
        case 3: r=p; g=q; b=v; break;
        case 4: r=t; g=p; b=v; break;
        case 5: r=v; g=p; b=q; break;
    }

    return new Color(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a && (Math.round(a * 100) / 100));
  },

  HSV2RGBString: function(h, s, v, a) {
    return this.HSV2RGB(h, s, v, a).toString();
  },

  RGB2HSV: function(rgb) {
    var r = rgb.r, g = rgb.g, b = rgb.b, a = rgb.a;
    
    var max   = Math.max(r, g, b),
        min   = Math.min(r, g, b),
        delta = max - min,
        s     = (max === 0) ? 0 : 1-(min/max),
        v     = max, h= undefined;

    switch (max) {
       case min: h=0; break;
       case r:   h=(g-b)/delta;
                 if (g<b) {h+=6;}
                 break;
       case g:   h=2+(b-r)/delta; break;
       case b:   h=4+(r-g)/delta; break;
    }

    return {h: h / 6, s: s, v: v / 255, a: a};
  }
};

var ColorPicker = function(element, color, callback) {
  this.document = element.ownerDocument;
  var sbWrapper = element.querySelector('div.saturation_brightness');
  this.setupPicker(sbWrapper, 'sb', 'main');
  this.setupPicker(sbWrapper, 'saturation', 'saturation');
  this.setupPicker(sbWrapper, 'brightness', 'brightness');
  this.setupPicker(element.querySelector('div.opacity'), 'opacity');
  this.setupPicker(element.querySelector('div.hue'), 'hue');
  //after setupPicker()  
  this.sbWidth = this.sbWidth -1;
  this.sbHeight= this.sbHeight-1;

  this.setupBounds();
  this.setupObservers();
  this.callback = callback;
  this.setColor(color);
};

ColorPicker.prototype = {
  
  h: 0, s: 0, v: 0, a: 1,   // avoid jconsole warnings
		
  setupObservers: function() {
    this.sbPicker.addEventListener('mousedown', this.sbMousedown, false);
    this.opacityPicker.addEventListener('mousedown', this.opacityMousedown, false);
    this.huePicker.addEventListener('mousedown', this.hueMousedown, false);
    
    var body = this.document.body;
    //Madara: new 'hue-scroll'
    body.addEventListener('MozMousePixelScroll', this.hueMouseScroll, false);
    
    body.addEventListener('mousemove', this.mouseMove, false);
    body.addEventListener('mouseup'  , this.mouseUp, false);
    body.addEventListener('mousedown', this.bodyMouseDown, false);
    
    body.addEventListener('mouseover', this.bodyMouse_over, false); // mouseenter doesn't work here
  },

  hueMouseScroll: function(e) {
	  
	  e.preventDefault(); // DONT move scrolling bars if present!
	  
	  //this.sbDrag = true;
	  this.offset = this.cumulativeOffsetWithBorders(this.sbPicker);
	  //this.mous_Move(e);

	  var oldTop= this.hueTop;  //parseInt((""+this.hueHandle.style.top).split("px")[0]);
	  var gap= 3; 
	  if(e.detail<0){ gap = -gap; }
	  var newTop= Math.round((oldTop + gap)/gap)*gap; //e.detail/20.0;
	  
	  newTop= newTop>this.hueHeight? 0: (newTop<0? this.hueHeight: newTop );
	  
	  //this.setHue(newTop - this.offset.top);
	  this.setHue( newTop );
	  this.colorChanged();
  },
  
  
  dispose: function() {
    this.sbPicker.removeEventListener('mousedown', this.sbMousedown);
    this.opacityPicker.removeEventListener('mousedown', this.opacityMousedown);
    this.huePicker.removeEventListener('mousedown', this.hueMousedown);
 
    var body = this.document.body;
    //Madara: new 'hue-scroll'
    body.removeEventListener('MozMousePixelScroll', this.hueMouseScroll);

    body.removeEventListener('mousemove', this.mouseMove);
    body.removeEventListener('mouseup'  , this.mouseUp);
    body.removeEventListener('mousedown', this.bodyMouseDown);

    body.removeEventListener('mouseover', this.bodyMouse_over);
  },
  
  setupPicker: function(wrapperElement, pickerType, handleClass) {
    wrapperElement.borders = this.getBorderWidths(wrapperElement);
    this[pickerType + 'Picker'] = wrapperElement;
    this[pickerType + 'Handle'] = wrapperElement.querySelector('img' + (handleClass ? '.' + handleClass : ''));
    this[pickerType + 'Width']  = wrapperElement.offsetWidth  - wrapperElement.borders.left - wrapperElement.borders.right;
    this[pickerType + 'Height'] = wrapperElement.offsetHeight - wrapperElement.borders.top  - wrapperElement.borders.bottom;
  },

  getBorderWidths: function(el) {
    var borders = {}, borderTypes = ['top', 'right', 'bottom', 'left'], borderType, borderCSSName;
    for (var i = 0; borderType = borderTypes[i++];) {
      borderCSSName = 'border' + borderType.charAt(0).toUpperCase() + borderType.substring(1) + 'Width';
      borders[borderType] = parseInt(el.style[borderCSSName] || document.defaultView.getComputedStyle(el, null)[borderCSSName], 10);
    }
    return borders;
  },

  setupBounds: function() {
    var methodsToBind = ['sbMousedown', 'opacityMousedown', 'hueMousedown', 'mouseMove', 'mouseUp', 'browserMouseUp', 'hueMouseScroll', 'bodyMouse_over'], 
        i = methodsToBind.length;
    while(i--) { this[methodsToBind[i]] = bind(this[methodsToBind[i]], this); }
  },

  popUpOpened: function() {
    globalDocument.addEventListener('mouseup', this.browserMouseUp, false);
  },

  popUpClosed: function() {
    globalDocument.removeEventListener('mouseup', this.browserMouseUp, false);
  },

  cumulativeOffsetWithBorders: function(element) {
    var offset = cumulativeOffset(element);
    return {top: offset.top + element.borders.top, left: offset.left + element.borders.left};
  },

  sbMousedown: function(e) {
    this.sbDrag = true;
	var target = e.target;
	this.sbExplicitHandle = (target == this.brightnessHandle && this.brightnessHandle) || (target == this.saturationHandle && this.saturationHandle);
    this.offset = this.cumulativeOffsetWithBorders(this.sbPicker);
    this.mouseMove(e);
  },

  opacityMousedown: function(e) {
    this.opacityDrag = true;
    this.offset = this.cumulativeOffsetWithBorders(this.opacityPicker);
    this.mouseMove(e);
  },

  hueMousedown: function(e) {
    this.hueDrag = true;
    this.offset  = this.cumulativeOffsetWithBorders(this.huePicker);
    this.mouseMove(e);
  },

  mouseMove: function(e) {
    if (this.sbDrag) {
		stopEvent(e);
		//is.setSbPicker(e.pageY - this.offset.top,        e.pageX - this.offset.left);
		var top =        e.pageY - this.offset.top, left = e.pageX - this.offset.left;
		if (this.sbExplicitHandle == this.brightnessHandle) {
			left = parseInt(this.sbHandle.style.left);
		} else if (this.sbExplicitHandle == this.saturationHandle) {
			top  = parseInt(this.sbHandle.style.top );
		}
		this.setSbPicker(top, left);
		this.colorChanged();
    } else if (this.opacityDrag) {
      stopEvent(e);
      this.setOpacity(e.pageX - this.offset.left);
      this.colorChanged();
    } else if (this.hueDrag) {
      stopEvent(e);
      this.setHue(e.pageY - this.offset.top);
      this.colorChanged();
    }
  },

  mouseUp: function(e) {
    this.mouseMove(e);
    this.notDragging();
  },

  notDragging: function() {
    this.sbDrag = this.hueDrag = this.opacityDrag = false;
  },

  browserMouseUp: function() {
    this.notDragging();
  },

  bodyMouseDown: function(e) {
    // stop user from accidentally doing mouse selection (dragger IMG elements are selectable and look ugly when in selection)
    e.preventDefault();
  },

  //turn off dragging when re-entering without any button pressed
  bodyMouse_over: function(e) {
	  if( e.target.id == "picker" ){ // main div!
		  
		  //dummy TEST 
		  //this.hueMouseScroll(e);
		  
		  // e.buttons valid from gecko-15 - [On Mac OS X 10.5, buttons attribute always returns 0? ouch!]  -  https://developer.mozilla.org/en-US/docs/DOM/MouseEvent
		  if ( e.buttons === 0 ) { // NO buttons pressed
			  this.notDragging();
		  }
	  }
  },
  
  setColor: function(rgb) {
    var hsv = ColorConverter.RGB2HSV(rgb);
    this.setHue(Math.round(Math.abs(1 - hsv.h) * this.hueHeight));
    this.setSbPicker(this.sbHeight - Math.round(hsv.v * this.sbHeight), Math.round(hsv.s * this.sbWidth));
    this.setOpacity(Math.round(rgb.a * this.opacityWidth));
  },
  
  setSbPicker: function(top, left) {
    top  = this.makeWithin(top,  0, this.sbHeight);
    left = this.makeWithin(left, 0, this.sbWidth );
    this.v = (this.sbHeight - top) / this.sbHeight;
    this.s = left / this.sbWidth;
    this.sbHandle.style.top  = this.brightnessHandle.style.top  = top  + 'px';
    this.sbHandle.style.left = this.saturationHandle.style.left = left + 'px';

    this.updateOpacityPickerColor();
  },

  hueTop: 0,
  setHue: function(top) {
    top    = this.makeWithin(top, 0, this.hueHeight);
    this.h = (this.hueHeight - top) / this.hueHeight;
    this.hueHandle.style.top = top + 'px';

    this.hueTop= top;
    
    this.updateSbPickerColor();
    this.updateOpacityPickerColor();
  },
  
  setOpacity: function(left) {
    left = this.makeWithin(left, 0, this.opacityWidth);
    this.a = left / this.opacityWidth;
    this.opacityHandle.style.left = left + 'px';
  },

  updateSbPickerColor: function() {
    this.sbPicker.style.backgroundColor = ColorConverter.HSV2RGBString(this.h, 1, 1);
  },

  updateOpacityPickerColor: function() {
    var startColor = ColorConverter.HSV2RGBString(this.h, this.s, this.v, 0);
    var endColor   = ColorConverter.HSV2RGBString(this.h, this.s, this.v, 1);
    this.opacityPicker.style.backgroundImage = '-moz-linear-gradient(0deg, ' + startColor + ', ' + endColor + '), url("../skin/checkboard.png")';
  },

  colorChanged: function() {
    this.callback(this.getRGBColor());
  },

  getRGBColor: function() {
    return ColorConverter.HSV2RGB(this.h, this.s, this.v, this.a);
  },

  makeWithin: function(val, min, max) {
    return val < min ? min : (val > max ? max : val);
  }
};

document.expose = function(values) {
  for (var valueName in values) {
    window[valueName] = values[valueName];
  }
};


var colorPicker= undefined;

document.initColorPicker = function(color, callback) {
  if (!window.colorPicker) {
    colorPicker = new ColorPicker(document.getElementById('picker'), color, callback);
  } else {
    colorPicker.callback = callback;
    colorPicker.setColor(color);
  }
  colorPicker.popUpOpened();
  
  colorPicker.colorChanged(); //calls callback() !!
};

document.do_setColor = function(color) {
    colorPicker.setColor(color);

    colorPicker.colorChanged(); //calls callback() !!
};


document.do_setMyOptions = function(obj_attrs, myOptions_dummy) {
	
	for( var attr in obj_attrs){
		document.documentElement.setAttribute( ""+attr, ""+obj_attrs[attr]);
	}
};


document.popUpClosed = function() {
  if (window.colorPicker) { colorPicker.popUpClosed(); }
};




/* 
bind() & Color needed here only If I call directly document.initColorPicker(...)

var bind= function bind(func, _this) {	...  };
var Color = function(r, g, b, a) { ... };
Color.prototype = { ... };
*/

/*
 //Used to test this:
 document.initColorPicker( {r:23, g:22, b:55, a:0.7}, function(aa){ print(" -- "+aa); } );
 
 */

