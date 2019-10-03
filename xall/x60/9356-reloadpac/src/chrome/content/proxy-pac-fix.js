window.addEventListener("load", runProxyPacFixOnLoad, false);

function runProxyPacFixOnLoad()
{
	window.removeEventListener("load", runProxyPacFixOnLoad, false);
  Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService().reloadPAC;
}
