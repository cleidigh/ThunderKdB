var message = "";

var t = browser.i18n.getMessage("button_multisync");
if (t != ""){document.getElementById("multisync").value = t;}
t = browser.i18n.getMessage("button_syncphonebook");
if (t != ""){document.getElementById("pbsync").value = t;}
t = browser.i18n.getMessage("button_syncorganizer");
if (t != ""){document.getElementById("orgsync").value = t;}

document.getElementById("multisync").onclick = function(){
	message = "run action=sync syncitem=multi";
	browser.runtime.getBackgroundPage().then(onGot);
};
document.getElementById("pbsync").onclick = async () => {
	message = "run action=sync syncitem=phonebook";
	browser.runtime.getBackgroundPage().then(onGot);
};
document.getElementById("orgsync").onclick = async () => {
	message = "run action=sync syncitem=organizer";
	browser.runtime.getBackgroundPage().then(onGot);
};

function onGot(page) {
  page.sendNativeMessage(message);
  window.close();
}