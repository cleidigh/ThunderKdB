var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cal } = ChromeUtils.import("resource://calendar/modules/calUtils.jsm");

class CardBookDatePicker extends MozXULElement {
	connectedCallback() {
		if (this.delayConnectedCallback()) {
			return;
		}
		
		this.prepend(CardBookDatePicker.fragment.cloneNode(true));
		this._menulist = this.querySelector(".datepicker-menulist");
		this._inputField = this._menulist._inputField;
		this._popup = this._menulist.menupopup;
		this._minimonth = this.querySelector("minimonth");
		
		// Other attributes handled in inheritedAttributes.
		this._handleMutation = (mutations) => {
			this.value = this.getAttribute("value");
		};
		this._attributeObserver = new MutationObserver(this._handleMutation);
		this._attributeObserver.observe(this, {
			attributes: true,
			attributeFilter: ["value"],
		});
		
		this.initializeAttributeInheritance();
		
		this.addEventListener("keydown", (event) => {
			if (event.key == "Escape") {
				this._popup.hidePopup();
			}
		});
		this._menulist.addEventListener("change", (event) => {
			this.value = this._menulist.value;
			event.stopPropagation();
			this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
		});
		this._popup.addEventListener("popupshown", () => {
			this._minimonth.focusDate(this._minimonthValue);
			const calendar = this._minimonth.querySelector(".minimonth");
			calendar.querySelector("td[selected]").focus();
		});
		this._minimonth.addEventListener("change", (event) => {
			event.stopPropagation();
		});
		this._minimonth.addEventListener("select", () => {
			this.value = cardbookDates.convertDateToDateString(this._minimonthValue, this.dateformat);
			this._popup.hidePopup();
			this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
		});
	}
	
	disconnectedCallback() {
		super.disconnectedCallback();
		
		this._attributeObserver.disconnect();
		
		if (this._menulist) {
			this._menulist.remove();
			this._menulist = null;
			this._inputField = null;
			this._popup = null;
			this._minimonth = null;
		}
	}
	
	static get fragment() {
		// Accessibility information of these nodes will be
		// presented on XULComboboxAccessible generated from <menulist>;
		// hide these nodes from the accessibility tree.
		let frag = document.importNode(MozXULElement.parseXULToFragment(`
			<menulist is="menulist-editable" class="datepicker-menulist" editable="true" sizetopopup="false">
				<menupopup ignorekeys="true" popupanchor="bottomright" popupalign="topright">
					<minimonth tabindex="0"/>
				</menupopup>
			</menulist>
		`), true);
		
		Object.defineProperty(this, "fragment", { value: frag });
		return frag;
	}
	
	static get inheritedAttributes() {
		return { ".datepicker-menulist": "disabled" };
	}
	
	set dateformat(val) {
	}
	
	get dateformat() {
		return cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, cardbookPreferences.getVCardVersion(wdw_cardEdition.workingCard.dirPrefId));
	}
	
	set value(val) {
		this._inputBoxValue = val;
		let myDate = cardbookDates.convertDateStringToDate(val, this.dateformat);
		if (myDate != "WRONGDATE" && myDate.getFullYear() != cardbookDates.defaultYear) {
			this._minimonthValue = myDate;
		} else {
			this._minimonthValue = new Date();
		}
	}
	
	get value() {
		return this._inputBoxValue;
	}
	
	set _inputBoxValue(val) {
		this._inputField.value = val;
	}
	
	get _inputBoxValue() {
		return this._inputField.value;
	}
	
	set _minimonthValue(val) {
		this._minimonth.value = val;
	}
	
	get _minimonthValue() {
		return this._minimonth.value;
	}
}

const MenuBaseControl = MozElements.BaseControlMixin(MozElements.MozElementMixin(XULMenuElement));
MenuBaseControl.implementCustomInterface(CardBookDatePicker, [
	Components.interfaces.nsIDOMXULMenuListElement,
	Components.interfaces.nsIDOMXULSelectControlElement
]);

customElements.whenDefined("menulist-editable").then(() => {
	customElements.define("cardbookdatepicker", CardBookDatePicker);
});
