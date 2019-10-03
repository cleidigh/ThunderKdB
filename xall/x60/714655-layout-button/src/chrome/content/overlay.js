Components.utils.import('resource://gre/modules/Services.jsm');

/**
 * turtletec_layoutbutton namespace.
 */
if (typeof turtletec_layoutbutton == "undefined") {
  var turtletec_layoutbutton = {
    /**
     * Initializes this object.
     */
    init : function() {
      this.obsService =
        Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    }
  };

  turtletec_layoutbutton.init();
};


/**
 * Controls the browser overlay.
 */
turtletec_layoutbutton.MailOverlay = {
	/**
	* Initializes this object.
	*/
	init : function(aEvent) {
		this._stringBundle = document.getElementById("layoutbutton");
	},
	cycleLayout : function() {
		var num = turtletec_layoutbutton.MailOverlay.getCurrentLayout();
		switch(num){
			case 0: num = 1; break;
			case 1: num = 2; break;
			case 2: num = 0; break;
			default: num = 0; break;
		}
		ChangeMailLayout(num);
	},
	getCurrentLayout : function() {
		return Services.prefs.getIntPref('mail.pane_config.dynamic');
	}
};

window.addEventListener( "load", function() { turtletec_layoutbutton.MailOverlay.init(); }, false );