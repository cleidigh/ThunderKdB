var gColorPicker;

function onLoad()
{
	var arguments = window.arguments[0];
	gColorPicker = new ColorPicker(arguments);
	gColorPicker.init();
}

function ColorPicker(arg)
{
	this.retObj = arg;
	this.retObj.cancel = true;
	this.initialized = false;
	this.colorPickerElem = document.getElementById("colorpicker");
	this.colorradio = document.getElementById("colorradio");
	//this.noColorButtonElem = document.getElementById("button_no_color");
	//this.clearColorButtonElem = document.getElementById("button_clear_color");
}

ColorPicker.prototype.init = function()
{
	//this.colorPickerElem.color = this.retObj.color;
	//this.colorPickerElem.value = this.retObj.color;
	if (this.retObj.color == "NONE") {
		this.colorradio.value = 0;
	} else if (this.retObj.color == ""){
		this.colorradio.value = 1;
	}
	this.initialized = true;
}

ColorPicker.prototype.onOK= function()
{
	var value = this.colorradio.value;
	var color = "";
	if (value == 0) {
		color = "NONE";
	} else if (value == 1) {
		color = "";
	} else {
		color = this.colorPickerElem.value;
	}
	
	this.retObj.color = color;
	this.retObj.cancel = false;
	window.close();
}
/*
ColorPicker.prototype.onChangeColorByButton = function(button)
{
	this.retObj.color = button.getAttribute("color");
	this.retObj.cancel = false;
	window.close();
}

ColorPicker.prototype.onChangeColorByPicker = function()
{
	if (!this.initialized) return;
	//this.retObj.color = this.colorPickerElem.color;
	this.retObj.color = this.colorPickerElem.value;
	this.retObj.cancel = false;
	window.close();
}
*/