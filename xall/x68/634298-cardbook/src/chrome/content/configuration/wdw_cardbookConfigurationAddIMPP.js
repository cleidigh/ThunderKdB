function checkRequired () {
	if (document.getElementById('IMPPCodeTextBox').value != "" && document.getElementById('IMPPLabelTextBox').value != "" && document.getElementById('IMPPProtocolTextBox').value != "") {
		document.querySelector("dialog").getButton("accept").disabled = false;
	} else {
		document.querySelector("dialog").getButton("accept").disabled = true;
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	document.getElementById('IMPPCodeTextBox').value = window.arguments[0].code;
	document.getElementById('IMPPLabelTextBox').value = window.arguments[0].label;
	document.getElementById('IMPPProtocolTextBox').value = window.arguments[0].protocol;
	document.getElementById('IMPPCodeTextBox').focus();
	checkRequired();
};

function onAcceptDialog () {
	window.arguments[0].code = document.getElementById('IMPPCodeTextBox').value.replace(/:/g, "").trim();
	window.arguments[0].label = document.getElementById('IMPPLabelTextBox').value.replace(/:/g, "").trim();
	window.arguments[0].protocol = document.getElementById('IMPPProtocolTextBox').value.replace(/:/g, "").trim();
	window.arguments[0].typeAction="SAVE";
	close();
};

function onCancelDialog () {
	window.arguments[0].typeAction="CANCEL";
	close();
};

document.addEventListener("DOMContentLoaded", onLoadDialog);
document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
document.addEventListener("popupshowing", cardbookRichContext.loadRichContext, true);
document.addEventListener("input", checkRequired, true);
document.addEventListener("command", checkRequired, true);
