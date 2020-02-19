var gQuerySaver;

function onLoad()
{
	var arguments = window.arguments[0];
	gQuerySaver = new TTBQuerySaver(arguments);
	gQuerySaver.doEnabling("");
}

function TTBQuerySaver(arg)
{
	this.arg = arg;
	document.getElementById("name").focus();
}

TTBQuerySaver.prototype.onOK = function()
{
	this.arg.catname = document.getElementById("name").value;
}

TTBQuerySaver.prototype.doEnabling = function(name)
{
	document.documentElement.getButton("accept").disabled = !name;
}
