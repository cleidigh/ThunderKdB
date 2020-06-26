var QNconfSave = {

	onLoad : function()
	{
		var Show = window.arguments[1];
		var TabName = window.arguments[2];
		var Save = window.arguments[3];
		var stringBundle = document.getElementById("csstrings");

		for(var i=1; i<=6; i++)
		{
		var Name
		try{Name = QN_globalvar.getBranch.getComplexValue("tab"+i+"name",Components.interfaces.nsIPrefLocalizedString).data}
		catch(e){Name =stringBundle .getString("default.notetitle")+" "+i}
		var checkbox = document.getElementById('cb'+i);
		checkbox.label = stringBundle.getFormattedString("confirmsave.note.label",[i, Name]);
		checkbox.hidden = !Show[i] || !Save[i];
		checkbox.checked = true;
		}
	},

	qnAccept : function()
	{
	window.arguments[0].val = true;
		var Save = window.arguments[3];
		for(var i=1; i<=6; i++)
			Save[i] = document.getElementById('cb'+i).checked;
		return true;
	},

	qnCancel : function()
	{
	window.arguments[0].val = true;
		var Save = window.arguments[3];
		for(var i=1; i<=6; i++)
			Save[i] = document.getElementById('cb'+i).checked=false;
		return true;
	}
};