Components.utils.import("resource://redthunderminebird/common.js");

load("resource://redthunderminebird/utility.js", this);

function onLoad() {
	var title = document.getElementById('redthunderminebird-title');
	title.value = window.arguments[0].title;

	var link = document.getElementById('redthunderminebird-link');
	link.value = window.arguments[0].label;
}

function onTicket() {
	utility.openBrowser(window.arguments[0].value);
};
