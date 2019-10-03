"use strict";
var miczLightningReminderLeftButtonsPref = {

	onLoad: function(){
		//Fixing window height
		sizeToContent();
		var vbox = document.getElementById('rlb_tabbox');
		vbox.height = vbox.boxObject.height;
		sizeToContent();
	},
};
