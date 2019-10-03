
/**
 * This color util is based on colorpicker.com JS routines 
 */
	reminderfox.colorUtil = {

		getRgbCodeByRgbColors : function(red, green, blue) {
			red = parseInt(red).toString(16);
			green =  parseInt(green).toString(16);
			blue =  parseInt(blue).toString(16);
			red = red + "";
			green = green + "";
			blue = blue + "";
			while(red.length < 2) {
				red = "0" + red;
			}
			while(green.length < 2) {
				green = "0" + green;
			}
			while(blue.length < 2) {
				blue = "0" + "" + blue;
			}
			rgbColor = red + "" + green + "" + blue;
			return rgbColor.toUpperCase();
		},

		getRgbColorsByHsv : function(hue, saturation, valueBrightness) {
			Hi = Math.floor(hue / 60);
			if(hue == 360)
				hue = 0;
			f = hue / 60 - Hi;
			if(saturation > 1)
				saturation /= 100;
			if(valueBrightness > 1)
				valueBrightness /= 100;
			p = (valueBrightness * (1 - saturation));
			q = (valueBrightness * (1 - (f * saturation)));
			t = (valueBrightness * (1 - ((1 - f) * saturation)));
			switch(Hi) {
				case 0:
					red = valueBrightness;
					green = t;
					blue = p;
					break;
				case 1:
					red = q;
					green = valueBrightness;
					blue = p;
					break;
				case 2:
					red = p;
					green = valueBrightness;
					blue = t;
					break;
				case 3:
					red = p;
					green = q;
					blue = valueBrightness;
					break;
				case 4:
					red = t;
					green = p;
					blue = valueBrightness;
					break;
				default:
					red = valueBrightness;
					green = p;
					blue = q;
					break;
			}
			if(saturation == 0) {
				red = valueBrightness;
				green = valueBrightness;
				blue = valueBrightness;
			}
			red *= 255;
			green *= 255;
			blue *= 255;
			red = Math.round(red);
			green = Math.round(green);
			blue = Math.round(blue);
			return {
				red : red,
				green : green,
				blue : blue
			}
		},

		getRgbCodeByHsv : function(hue, saturation, valueBrightness) {
			while(hue >= 360)
			hue -= 360;
			var colors = this.getRgbColorsByHsv(hue, saturation, valueBrightness);
			return this.getRgbCodeByRgbColors(colors.red, colors.green, colors.blue);
		},

		getHsvByRgbCode : function(rgbColor) {
			rgbColor = rgbColor.replace('#', '');
			red = this.baseConverter(rgbColor.substr(0, 2), 16, 10);
			green = this.baseConverter(rgbColor.substr(2, 2), 16, 10);
			blue = this.baseConverter(rgbColor.substr(4, 2), 16, 10);
			if(red == 0 && green == 0 && blue == 0) {
				var returnArray = {};
				returnArray.hue = 0;
				returnArray.saturation = 0;
				returnArray.brightness = 0;
				return returnArray;
			}
			red = red / 255;
			green = green / 255;
			blue = blue / 255;
			maxValue = Math.max(red, green, blue);
			minValue = Math.min(red, green, blue);
			var hue = 0;
			if(maxValue == minValue) {
				hue = 0;
				saturation = 0;
			} else {
				if(red == maxValue) {
					hue = (green - blue) / (maxValue - minValue) / 1;
				} else if(green == maxValue) {
					hue = 2 + (blue - red) / 1 / (maxValue - minValue) / 1;
				} else if(blue == maxValue) {
					hue = 4 + (red - green) / (maxValue - minValue) / 1;
				}
				saturation = (maxValue - minValue) / maxValue;
			}
			hue = hue * 60;
			valueBrightness = maxValue;
			if(hue < 0)
				hue += 360;
			var returnArray = {};
			returnArray.hue = hue;
			returnArray.saturation = saturation;
			returnArray.brightness = valueBrightness;
			return returnArray;
		},

		baseConverter : function(numberToConvert, oldBase, newBase) {
			if(newBase == 10) {
				return parseInt(numberToConvert, 16);
			}
			if(newBase == 16) {
				return parseInt(numberToConvert).toString(16);
			}
			numberToConvert = numberToConvert + "";
			numberToConvert = numberToConvert.toUpperCase();
			var listOfCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			var dec = 0;
			for(var i = 0; i <= numberToConvert.length; i++) {
				dec += (listOfCharacters.indexOf(numberToConvert.charAt(i))) * (Math.pow(oldBase, (numberToConvert.length - i - 1)));
			}
			numberToConvert = "";
			var magnitude = Math.floor((Math.log(dec)) / (Math.log(newBase)));
			for(var i = magnitude; i >= 0; i--) {
				var amount = Math.floor(dec / Math.pow(newBase, i));
				numberToConvert = numberToConvert + listOfCharacters.charAt(amount);
				dec -= amount * (Math.pow(newBase, i));
			}
			if(numberToConvert.length == 0)
				numberToConvertToConvert = 0;
			if(!numberToConvert)
				numberToConvert = 0;
			return numberToConvert;
		},
	};
