const DEFAULT_PREFERENCES = {
	markAsJunk: true,
	moveToTrash: false
};

async function restore_options() {
	let prefs = await browser.storage.local.get(DEFAULT_PREFERENCES);
	for (let key of Object.keys(prefs)) {
		let elem = document.getElementById(key);
		if (!elem) continue;
		if (elem.type == "checkbox") {
			elem.checked = prefs[key];
		} else if (elem.getAttribute("type") == "radio") {
			let item = document.querySelector(`input[type='radio'][name='${elem.id}'][value='${prefs[key]}']`);
			item.checked = true;
		} else {
			elem.value = prefs[key];
		}
	}
}

function change_options(event) {
	let node = event.target;
	let defaultPrefs = Object.keys(DEFAULT_PREFERENCES);
	let isPreference = defaultPrefs.includes(node.id) || defaultPrefs.includes(node.name);
	if (!node.id || node.localName != "input" || !isPreference) return;

	if (node.getAttribute("type") == "checkbox") {
		browser.storage.local.set({ [node.id]: node.checked });
	} else if (node.getAttribute("type") == "number") {
		browser.storage.local.set({ [node.id]: parseInt(node.value, 10) });
	} else if (node.getAttribute("type") == "text") {
		browser.storage.local.set({ [node.id]: node.value });
	} else if (node.getAttribute("type") == "radio") {
		browser.storage.local.set({ [node.name]: node.value });
	}
}

function setup_listeners() {
	document.body.addEventListener("change", change_options);
}

function setup_localization() {
	for (let node of document.querySelectorAll("[data-l10n-id]")) {
		let l10nid = node.getAttribute("data-l10n-id");
		node.textContent = browser.i18n.getMessage(l10nid);
		if (node.localName == "label") {
			node = node.parentNode;
		}
		node.title = browser.i18n.getMessage(l10nid + ".title");
	}
}

document.addEventListener("DOMContentLoaded", setup_localization);
document.addEventListener("DOMContentLoaded", setup_listeners);
document.addEventListener("DOMContentLoaded", restore_options);
