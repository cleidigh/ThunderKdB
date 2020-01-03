
	var rmFxCalDAVedit = {

		accounts : null,
		accountID : null,
		account : null,
		calendarColor : "#FFFFBF",

		cReminders : null,

		go_Load : function () {
		// ------------------------------------------------
			this.cReminders  = window.arguments[0].cReminders;

			this.accounts    = window.arguments[0].accounts;
			this.accountID   = window.arguments[0].ID;

			this.calendarColor = "#FFFFBF";   // default color yellow (s=1, b=0.25)
			if (this.accountID != '?') {
				this.calendarColor = this.accounts[this.accountID].calendarColor
			}

			var accountName  = window.arguments[0].Name;
			var accountUrl   = window.arguments[0].Url;
			var accountLogin = window.arguments[0].Login;
			var accountID    = window.arguments[0].ID;
			var accountTyp   = window.arguments[0].Typ;
			var accountColor = window.arguments[0].Color;

			var isNew        = window.arguments[0].isNew;

			document.getElementById('accountLogin').value    = accountLogin ? accountLogin : "";
			document.getElementById('accountLogin').setAttribute('accountURL',accountUrl);
			document.getElementById('accountLogin').setAttribute('accountTyp',accountTyp);
			document.getElementById('accountURLtext').value  = accountUrl;

			var loginData = reminderFox_getPassword ({
				ljURL    : accountUrl,
				username : accountLogin,
				password : ""
			});
			if (loginData) {
				document.getElementById('accountPW').value = loginData.password;
				document.getElementById('accountPW').type  = "password";
				document.getElementById('showPW').checked  = false ;
			}

			document.getElementById('loginButton').setAttribute('tooltiptext',"");
			document.getElementById('loginButton').disabled     = true;

			document.getElementById('accountName').value  = accountName ? accountName : "{Calendar Name}";
			if (accountName != "{Calendar Name}")
				document.getElementById('accountName').disabled = false;
			document.getElementById('accountID').value    = accountID;
			document.getElementById('accountID').disabled = true;


			// if account has event(s) some actions on the XUL are not allowed/changeable
			if (this.accounts) {

				if (!isNew) {
					document.getElementById('accountPW').disabled       = false;
					document.getElementById('showPW').disabled          = false;

					if (accountUrl.search('https://www.googleapis.com/caldav/v2/') === 0) {
						document.getElementById('accountPW').disabled    = true;
						document.getElementById('showPW').disabled       = true;
					}

					document.getElementById('calDAVserver').disabled    = true;
					document.getElementById('calDAVserver').setAttribute('tooltiptext',"");

					document.getElementById('accountURLtext').value     = accountUrl;
					document.getElementById('loginButton').setAttribute('oncommand','rmFxCalDAVedit.accountValidate(this);');
					document.getElementById('loginButton').disabled     = false;

				} else {
					document.getElementById('calDAVserver').disabled    = false;

					document.getElementById('loginButton').setAttribute('oncommand','rmFxCalDAVedit.accountsGet(this);');

					document.getElementById('accountURLtext').value     = "";

					document.getElementById('accountPW').disabled       = true;
					document.getElementById('showPW').disabled          = true;
				}

			}

			var aColor = window.arguments[0].calendarColor;
			document.getElementById("accountColorDefault")
				.setAttribute("style","background-color:" + aColor + ";border: green 1px solid;");
			document.getElementById("accountColorDefault").setAttribute('tooltiptext',
				"Account Color: " + aColor + " (Based on remote calendar)");
			document.getElementById("accountColorDefault").setAttribute('calendarColor', aColor);
		},

		/**
		 *   Top menu select for remote calendar server type
		 */
		calDAVserverSelect : function (xthis) {
		// ------------------------------------------------
		// reset the dialog elements
			document.getElementById('accountLogin').value = "";
			document.getElementById('accountLogin').disabled = true;

			document.getElementById('accountPW').value = "";
			document.getElementById('accountPW').disabled = true;

			document.getElementById('showPW').checked = false;
			document.getElementById('showPW').disabled = true;
			document.getElementById('gCalV2instruction').hidden = true;

			var accountURLBox = document.getElementById('accountURLBox');
			while (accountURLBox.hasChildNodes()) {
				if (accountURLBox.lastChild.id != "accountURLtext") accountURLBox.removeChild(accountURLBox.lastChild);
				if (accountURLBox.lastChild.id == "accountURLtext") break;
			}
			document.getElementById('accountURLtext').hidden    = false;
			document.getElementById('accountURLtext').disabled  = true;
			document.getElementById('accountURLtext').value     = "[Login] " + reminderfox.string("rf.calDav.edit.retrieve");

			document.getElementById('loginButton').label        = 'Login';
			document.getElementById('loginButton').setAttribute('tooltiptext',"");
			document.getElementById('loginButton').disabled     = true;
			document.getElementById('loginButton').removeAttribute('oncommand');

			document.getElementById('requestGCal2Button').hidden     = true;
			document.getElementById('requestGCal2Button').disabled   = true;

			document.getElementById('accountStatus').setAttribute('validated','true');
			document.getElementById('accountStatus').setAttribute('style', "font-weight: normal;color:black;");
			document.getElementById('accountStatus').value      = "";

			document.getElementById('accountName').value        = "{Calendar Name}";
			document.getElementById('accountName').disabled     = true;
			document.getElementById('accountID').value          = "?";
			document.getElementById('accountID').disabled       = true;

			document.getElementById('accountIDStatusLabel').value = "";

			document.getElementById('rmFxOK').disabled          = true;
			sizeToContent();

			// ---- if no calDAVserver template selected -- do nothing
			if (document.getElementById('calDAVserver').selectedIndex === 0) return;


			// ---- change xul elements on server selected -------
			var calDAVserver = document.getElementById('calDAVserver').selectedItem;

			var id       = calDAVserver.getAttribute('id');
			var label    = calDAVserver.getAttribute('label');

			document.getElementById('accountLogin').disabled    = false;

			document.getElementById('accountPWrow').hidden      = false;
			document.getElementById('gCalV2instruction').hidden = true;

			document.getElementById('accountPW').disabled       = false;
			document.getElementById('showPW').disabled          = false;


			document.getElementById('loginButton').disabled     = false;
			document.getElementById('loginButton').setAttribute('serverID',id);
			document.getElementById('loginButton').setAttribute('oncommand','rmFxCalDAVedit.accountsGet(this);');

			document.getElementById('accountURLtext').setAttribute('tooltiptext',calDAVserver.value);


			if (id == "General") { // as an example use 'ownCloud'
				var link = "http://localhost/owncloud/apps/calendar/caldav.php/calendars/admin/";
				document.getElementById('accountLogin').setAttribute('accountURL', link);

				document.getElementById('accountURLtext').value      = link;
				document.getElementById('accountURLtext').disabled   = false;

				document.getElementById('loginButton').label         = 'Login';
				document.getElementById('loginButton').disabled      = false;
			}

			if (id == "GCal2") {
				// [Request] button is to renew the account 'access'token' (GCal/V2)

				document.getElementById('accountURLtext').value      = reminderfox.string("rf.calDav.token.store");

				document.getElementById('accountPW').value           = "";
				document.getElementById('accountPW').disabled        = true;

				document.getElementById('showPW').checked            = false;
				document.getElementById('showPW').disabled           = true;

				document.getElementById('accountPWrow').hidden       = true;
				document.getElementById('gCalV2instruction').hidden  = false;

				document.getElementById('loginButton').label         = 'Paste';
				document.getElementById('loginButton').disabled      = true;
				document.getElementById('loginButton').setAttribute('oncommand','rmFxCalDAVedit.gcal2Save(this);');

				document.getElementById('requestGCal2Button').hidden      = false;
				document.getElementById('requestGCal2Button').disabled    = false;
			}

// reminderfox.util.Logger('Alert',"  server selection    >>" + id +"<<")

			// get usernames with Login Manager
			this.loginMUsernames(id /*host*/);
			sizeToContent();
		},


		do_CANCEL :function (mode, id)  {
		// ------------------------------------------------
			window.arguments[0].ID = "%%";
			window.close();
			return;
		},


		do_OK : function ()  {
		// ------------------------------------------------
		var accountID;

			var accountName = document.getElementById('accountName').value;
			if (accountName === "") accountName = document.getElementById('accountLogin').value;

			accountID = document.getElementById('accountID').value;
			accountID = accountID.charAt(0).toUpperCase();

			if (accountID == "?") {
				document.getElementById('accountIDStatusLabel').value = reminderfox.string("rf.calDav.account.selectID");
				document.getElementById('rmFxOK').disabled = true;
				return;
			}

			window.arguments[0].Name = accountName;
			window.arguments[0].ID = accountID;
			window.arguments[0].Typ = document.getElementById('accountLogin').getAttribute('accountTyp');		// VEVENT or VTODO
			window.arguments[0].Url = document.getElementById('accountLogin').getAttribute('accountURL');
			window.arguments[0].Login = document.getElementById('accountLogin').value;

			window.arguments[0].calendarColor = document.getElementById('accountColorDefault').getAttribute('calendarColor');
			window.close();
		},


		toggle_PW : function (xthis){
		// ------------------------------------------------
			var pwStatus = document.getElementById('accountPW');
			var cStatus = pwStatus.type;

			if (cStatus != "password") {
				document.getElementById('accountPW').type="password";
			} else {
				document.getElementById('accountPW').type="";
			}
		},


		/**
		*  Check manually entered accountID (blur on textbox)
		*/
		setCalDAV_ID : function (xthis) {
		// ------------------------------------------------
			// always disable the [OK] with changing the ID
			document.getElementById('rmFxOK').disabled = true;

			// if account holds event(s), the accountID can't be changed!
			var accountID = document.getElementById('accountID').value;
			if (document.getElementById('accountID').disabled === true) return;

			var aID = accountID.charAt(0).toUpperCase();
			document.getElementById('accountID').value = aID;

			if ((aID == "?") || (aID === "")) {
				document.getElementById('accountIDStatusLabel').value = reminderfox.string("rf.calDav.account.selectID");
				return;
			}

			if (this.accountValidateID(aID) === false) {
				document.getElementById('accountIDStatusLabel').value = reminderfox.string("rf.calDav.account.selectedIDused") + " [" + aID +"]";
				document.getElementById('accountID').disabled = false;
			} else {
				document.getElementById('accountIDStatusLabel').value = "";
			}
		},

		accountValidateID : function (id) {
			return (!this.accounts[id]);
		},

		/**
		*		Get server id; also for GCal2 build complete username account
		*/
		setUserName : function () {
		//-----------------------------------------
			var calDAVserver = document.getElementById('calDAVserver').selectedItem;
			var id = calDAVserver.getAttribute('id');

			if (id == "GCal2") {
				var username     = document.getElementById('accountLogin').value;
				var useraddress = "";

				if (username === "") {
					document.getElementById('accountStatus').value = "Enter user name"; //$$$_locale   reminderfox.string
					document.getElementById('accountStatus').setAttribute('style', "font-weight: bold;color:red;");
					return false;
				}

				document.getElementById('accountStatus').value = "";
				document.getElementById('accountStatus').setAttribute('style', "font-weight: normal;color:black;");

				var p = username.indexOf("@");
				if (p == -1) {
					username += '@gmail.com';
					document.getElementById('accountLogin').value = username;
				}
			}
		},


		gcal2Request : function () {
		//-----------------------------------------
			if(this.setUserName () === false) return;

			// if access/refresh keys are valid for user don't get new auth
			if (rmFx_CalDAV_gGCALPrincipalRedo () === true) return;

			document.getElementById('requestGCal2Button').disabled = true;
			document.getElementById('loginButton').disabled = false;

			var url = "https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=22822497261.apps.googleusercontent.com&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/calendar";
			reminderfox.util.openURL(url);
		},


		gcal2Save   : function (xthis) {
		// ------------------------------------------------
			var grant ='authorization_code';
			var token = reminderfox.util.copyTextfromClipboard();
			var myRequest = new reminderfoxX.calDAVrequest();
			myRequest.gcal2Token(this, grant, token);
		},


		/**
		*   [Login] use login details to get all remote calendars for uname/pw
		*/
		accountsGet : function (xthis) {
		// ------------------------------------------------
			rmFx_CalDAV_accountsGet(xthis, this.accounts);
		},


		/**
		*  Check selected calendar in pulldown menu with setup/login
		*    to get # of events
		*  Called with pulldown menu change or [Login]
		*/
		accountValidate : function (xthis) {
		// ------------------------------------------------
			rmFx_CalDAV_accountValidate(xthis, this.accounts);
		},


		accountHasEvents : function (account) {
		// ------------------------------------------------
			for (var name in account) {
				switch (name) {
					case 'ID':
					case 'Typ':
					case 'Active':
					case 'Name':
					case 'Url':
					case 'Login':
					case 'CTag':
					case 'Color':
					case 'calendarColor': break;

					default: {
						return true;
					}
				}
			}
			return false;
		},


		loginMUsernames: function (idHost) {
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var username;

			//clean menulist
			var accountLogin = document.getElementById('accountLoginPopup');
			while (accountLogin.hasChildNodes()) {
				if (accountLogin.lastChild.id != "accountLoginBox") accountLogin.removeChild(accountLogin.lastChild);
				if (accountLogin.lastChild.id == "accountLoginBox") break;
			}
			var host = "";
			if (idHost == "GCal2") host = "https://www.googleapis.com/caldav/v2/";
			if (idHost == "fruux") host = "https://dav.fruux.com/calendars/";
			if ((!host) || (host === "")) {
				document.getElementById('accountLoginBox').label = "";   //clear, don't read usernames
				return;
			}

			document.getElementById('accountLoginBox').label = this.usernameSelection;
			var checkNames =" ";

			try {
				// Get Login Manager
				var loginManager = Cc["@mozilla.org/login-manager;1"].
					getService(Ci.nsILoginManager);

				// Find users for this extension
				var logins = loginManager.getAllLogins({});

				for (var i = 0; i < logins.length; i++) {
					if (logins[i].hostname.search(host) != -1) {

						if (idHost == "GCal2") {
							var last = logins[i].hostname.lastIndexOf("/")+1;
							username = logins[i].hostname.substring(last, logins[i].hostname.length);
						}

						if (idHost == "fruux") {
							username = logins[i].username;
						}

						if (checkNames.search(username.toUpperCase()) == -1) {
							var menuitem = document.createElement("menuitem");
								accountLogin.appendChild(menuitem);
								menuitem.setAttribute("label", username);
							checkNames += " " + username.toUpperCase();
						}
					}
				}
				var accountLogs = document.getElementById("accountLogin");
				var items = accountLogs.firstChild.childNodes;
				accountLogs.selectedItem = items[1]; // to be sure select first 1 then 0
				accountLogs.selectedItem = items[0];
			}
			catch(ex) {
				// This will only happen if there is no nsILoginManager component class
			}
		},

		clearMenuUserName: function (xthis) {
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			var textbox = xthis.value;
			if (textbox == this.usernameSelection) xthis.value = "";
		},

		usernameSelection : "-- Enter User Name or use menu selector--" // $$$_locale
	};
