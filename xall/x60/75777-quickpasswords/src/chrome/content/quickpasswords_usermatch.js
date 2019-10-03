"use strict";


QuickPasswords.UserMatch = {
	Main: null,
	createSitesItem: function createSitesItem(url) {
		let listItem = document.createElement("listitem");
		listItem.setAttribute("label", url);
		listItem.setAttribute("value", url);
		return listItem;
	},
	
	createLoginsItem: function createLoginsItem(url) {
		let listItem = document.createElement("listitem");
		listItem.setAttribute("label", url);
		listItem.setAttribute("value", url);
		return listItem;
	},
	
	onLoadUserMatch: function onLoadUserMatch() {
		if (window.arguments && window.arguments[0].inn) {
			let params = window.arguments[0].inn,
			    usr = params.user,
			    pwd = params.newPassword,
					old = params.oldPassword,
					logins = params.logins;
			this.Main = params.instance;
			const util = QuickPasswords.Util;
			util.onLoadVersionInfoDialog(); // fill the version info number
			//get site and domain and open the window
			let siteListbox = document.getElementById('sites'),
			    siteLabel = document.getElementById('lblSites'),
			    userListbox = document.getElementById('logins');

			document.getElementById('txtUser').value = usr;
			document.getElementById('txtNewPassword').value = pwd;
			document.getElementById('txtOldPassword').value = old;
		
		  let countSites = 0,
			    countLogins = 0;
			for (let i=0; i<logins.length; i++) {
				siteListbox.appendChild(this.createSitesItem(logins[i].site));
				let found=false;
				for (let j=0; j<userListbox.itemCount; j++) {
					let us = userListbox.getItemAtIndex(j);
					if (us.value == logins[i].user) {
						found = true;
						break;
					}
				}
				if (!found)
					userListbox.appendChild(this.createLoginsItem(logins[i].user));
			}
			siteLabel.value = siteLabel.value  + ' (' + siteListbox.itemCount.toString() + ')';
			this.notify(siteListbox.itemCount.toString() + ' URLs and ' + 
			  userListbox.itemCount.toString() + ' logins found.');
			
			// select direct matches
			for (let j=0; j<userListbox.itemCount; j++) {
				let item = userListbox.getItemAtIndex(j);
				if (item.value == usr) {
					userListbox.toggleItemSelection(item);
				}
			}
				
		}
	},

	onAcceptPassword: function onAcceptPassword() {
		let pwd = document.getElementById('txtNewPassword').value,
				old = document.getElementById('txtOldPassword').value,
				userListbox = document.getElementById('logins'),
				selectedUsers = [];
		for (let j=0; j<userListbox.selectedItems.length; j++) {
			selectedUsers.push(userListbox.selectedItems[j].value);
		}

		if (QuickPasswords.Preferences.isDebug) debugger;
		if (!selectedUsers.length) {
			let msg = QuickPasswords.Util.getBundleString("selectUserMessage", "Select at least one user!");
			QuickPasswords.promptParentWindow.alert(msg);
		}
		else {
			// remote call for modifyPasswords_Complete()
			let info = {
				'cmd':'changePasswordsComplete',
				'pwd': old,
				'newPwd': pwd,
				'users': selectedUsers
			};
			let targetWindow = QuickPasswords.getPasswordManagerWindow('', false);
			targetWindow.postMessage(info, "*"); 
		}
	},
	
	selectAllUsers: function selectAllUsers() {
		let userListbox = document.getElementById('logins');
		userListbox.selectAll();
	},
	
	notify: function notify(p) {
	  QuickPasswords.Util.slideAlert('QuickPasswords', p);
	}
	
};

// QuickPasswords.Util.slideAlert('QuickPasswords','quickpasswords_usermatch');

