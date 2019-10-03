var botonCuentaDefault = document.getElementById("accountActionsDropdownSetDefault"); //Se obtiene para capturar el evento de cuando alguien clica encima del boton 

botonCuentaDefault.addEventListener("click",function(e) { 
	clickButtonDefault(); 
},false);

var consoleAccountManager = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);

function clickButtonDefault()
{
	consoleAccountManager.logStringMessage("CLICADO EL BOTON DEFAULT");
	
	listenerFolders.recargarFolderDefault();
}