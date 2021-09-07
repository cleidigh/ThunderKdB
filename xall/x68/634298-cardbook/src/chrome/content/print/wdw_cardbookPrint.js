{
	var { MailE10SUtils } = ChromeUtils.import("resource:///modules/MailE10SUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	// test i18n.updateDocument({ extension: cardbookRepository.extension });

	let ownerWindow = window.browsingContext.topChromeWindow;
	let ownerDocument = ownerWindow.document;
	let otherForm = document.querySelector("form");
	otherForm.hidden = true;

	let form = document.importNode(ownerDocument.getElementById("cardbookPrintForm").content.firstElementChild, true);
	form.addEventListener("submit", event => {
		event.preventDefault();
		form.hidden = true;
		otherForm.hidden = false;
	});
	otherForm.parentNode.insertBefore(form, otherForm);

	let nodes = form.querySelectorAll("input");
	for (let node of nodes) {
		node.addEventListener("change", updatePreview);
	}

	/** Show something in the preview as soon as it is ready. */
	function updateWhenReady() {
		document.removeEventListener("page-count", updateWhenReady);
		updatePreview();
	}
	document.addEventListener("page-count", updateWhenReady);

	/**
	 * Read the selected options and update the preview document.
	 */
	async function updatePreview() {
		let cards = ownerDocument.getElementById("cardbookPrintContent").getAttribute("cards");
		cardbookPrint.buildHTML(PrintEventHandler.printPreviewEl.querySelector("browser").contentDocument,
												cards,
												{ headers: document.getElementById("displayHeadersCheckBox").checked,
													fieldNames: document.getElementById("displayFieldNamesCheckBox").checked,
													fn: document.getElementById("displayCheckBox").checked,
													personal: document.getElementById("personalCheckBox").checked,
													org: document.getElementById("orgCheckBox").checked,
													custom: document.getElementById("customCheckBox").checked,
													categories: document.getElementById("categoriesCheckBox").checked,
													adr: document.getElementById("adrCheckBox").checked,
													tel: document.getElementById("telCheckBox").checked,
													email: document.getElementById("emailCheckBox").checked,
													impp: document.getElementById("imppCheckBox").checked,
													url: document.getElementById("urlCheckBox").checked,
													event: document.getElementById("eventCheckBox").checked,
													note: document.getElementById("noteCheckBox").checked } );
		PrintEventHandler._updatePrintPreview();
	}
}