function initGroupMemberUI() {
	var anchorPoint = document.getElementById('cvbAddresses');	
	var cvbGroupMembers = document.createElement("vbox");
	cvbGroupMembers.setAttribute("id", "cvbGroupMembers");
	cvbGroupMembers.setAttribute("class","cardViewGroup");
	cvbGroupMembers.setAttribute("collapsed","true");
	
	var cvbHeading = document.createElement("description");
	cvbHeading.setAttribute("id","cvbGroupMembersDesc");
	cvbHeading.setAttribute("class","CardViewHeading");
	cvbHeading.setAttribute("value", "Membres");
	cvbGroupMembers.appendChild(cvbHeading);
	
	var cvbLink = document.createElement("description");
	cvbLink.setAttribute("id","cvbGroupMembersLink");
	cvbLink.setAttribute("class","CardViewLink");
	cvbGroupMembers.appendChild(cvbLink);	
	var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
	a.onclick = function() { window.openDialog('chrome://ldap-groups/content/members-dialog.xul', 
											   'dlg', 'chrome,resizable,modal', getCardInfos() ); };
	cvbLink.appendChild(a);
	var text = document.createTextNode("Voir les membres");
	a.appendChild(text);
	var cvbAddresses = document.getElementById('cvbAddresses');
	cvbAddresses.parentNode.appendChild(cvbGroupMembers);	
}

function OpenMembersDialog() {
  // Members dialog 
  if(window.arguments && (window.arguments[0]))  {
		var treeBox = document.getElementById('members-tree');
		var itemIdx = getSelectedItem(treeBox)[0];
		var item = treeView.data[itemIdx];
		params = window.arguments[0];
		params.groupDn = item.dn;
		params.groupFilter = item.filter;
		params.groupScope = item.scope;
  } else { // Main addressbook panel
		params = getCardInfos();
		if(! params) return;
  }
	window.openDialog('chrome://ldap-groups/content/members-dialog.xul', 
											   null, 'location=1,centerscreen=no,chrome,resizable,modal', params);
}

function getCardInfos() {
	let result = {};
	let cards = GetSelectedAbCards();
	if(cards.length >= 1) {
		let tmpCard = cards[0];
		if(tmpCard && tmpCard.properties && (tmpCard instanceof Components.interfaces.nsIAbLDAPCard)) {
			tmpCard = tmpCard.QueryInterface(Components.interfaces.nsIAbLDAPCard);	
			let selectedDirectoryURI = GetSelectedDirectory();
			let selectedDirectory = GetDirectoryFromURI(selectedDirectoryURI);
			selectedDirectory = selectedDirectory.QueryInterface(Components.interfaces.nsIAbLDAPDirectory);
			let currentUrl = selectedDirectory.lDAPURL;
			
			result['authDn'] = selectedDirectory.authDn;
			if(selectedDirectory.authDn && (selectedDirectory.authDn != '')) {
			  let userpassword = LDAPGroupsUtils.getPasswordForServer(currentUrl.prePath, selectedDirectory.authDn, false, currentUrl.spec);
			  if(! userpassword) return;
			  result['password'] = userpassword.password;
			}
			result['url'] = currentUrl.spec;
			result['groupDn'] = tmpCard.dn;
			result['groupFilter'] = '(objectclass=*)';
			result['groupScope'] = Components.interfaces.nsILDAPURL.SCOPE_BASE;
		}
	}
	return result;
}

setTimeout( function() {

if(typeof(OriginalGetDirectoryFromURI) == 'undefined') {
	var OriginalGetDirectoryFromURI = GetDirectoryFromURI;
	var GetDirectoryFromURI = function(uri) {
		var myUri = uri;
		var dir = OriginalGetDirectoryFromURI(myUri);	
		// Customize the LDAP Directory
		if(dir instanceof Components.interfaces.nsIAbLDAPDirectory) {
			var obj= new Object();
			obj.originalAttributeMap = dir.attributeMap;
			// And bring our own customization of attributeMap
			obj.attributeMap = new Object();
			obj.attributeMap.__proto__ = dir.attributeMap;
			// The rest remains the same
			obj.__proto__ = dir;
			dir = obj;
		}
		return dir;
	};
}

if(typeof(OriginalUpdateCardView) == 'undefined') {
  var OriginalUpdateCardView = UpdateCardView;
  UpdateCardView = function() {
    let cvbGroupMembers = document.getElementById('cvbGroupMembers');
    cvbGroupMembers.setAttribute("collapsed","true");
    let cards = GetSelectedAbCards();
    if(cards.length >= 1) {
	  let tmpCard = cards[0];
	  //let currentUrl = GetDirectoryFromURI(GetSelectedDirectory()).lDAPURL;
	  if(tmpCard && tmpCard.properties && (tmpCard instanceof Components.interfaces.nsIAbLDAPCard)) {
		tmpCard = tmpCard.QueryInterface(Components.interfaces.nsIAbLDAPCard);	
		let obj = tmpCard.getProperty("ObjectClasses.all", "null" );
		let isGroup = false;
		groupsObjectclasses.forEach(function(o) {
			obj.forEach(function(p){
						if(p.toLowerCase() == o.toLowerCase())isGroup = true;
			});
		});
		
		if(isGroup) {
			cvbGroupMembers.setAttribute("collapsed","false");
		} 
	  }
   }
   OriginalUpdateCardView();
  }
}
}, 100);
