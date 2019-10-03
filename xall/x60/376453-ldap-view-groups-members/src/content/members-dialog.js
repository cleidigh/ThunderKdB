var LDAPGroupsMemberDialog = {
	XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
	ioService: Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService),

	onUnload: function () {
		if(typeof(LDAPGroupsMemberDialog.connection) != "undefined") {
			LDAPGroupsMemberDialog.connection.close();
		}
	},

	onLoad: function () {
		// Create the tree
		this.initTree();
		// Disable the button
		var button = document.getElementById('viewMembersButton');
		button.disabled = true;
		if(window.arguments && (window.arguments[0]))  {
			params = window.arguments[0];
			url = params.url;
			dn = params.authDn;
			password = params.password;
			groupDn = decodeURIComponent(escape(params.groupDn));
			groupFilter = params.groupFilter;
			groupScope = params.groupScope;
		}
		var groupDnLabel = document.getElementById('groupDnLabel');
		groupDnLabel.value = groupDn;
		this.fetchGroupMembers(url, dn, password, groupDn, groupScope, groupFilter);
	},

	onMemberSelection: function() {
		try {
			let treeBox = document.getElementById('members-tree');
			let viewMembersButton = document.getElementById('viewMembersButton');
			let itemIdx = LDAPGroupsUtils.getSelectedItem(treeBox)[0];
			let item = LDAPGroupsMemberDialog.treeView.data[itemIdx];
			if(!item) return;
			if(item.type == 'GROUP') {
				viewMembersButton.disabled = false;
			} else{
				viewMembersButton.disabled = true;
			}
		} catch(e){Components.utils.reportError(e);}
	},

	initTree: function () {
		let myTree = document.getElementById('members-tree');
		let myTreeCols = myTree.getElementsByTagName('treecols')[0];
		let colHeaders = attributesToDisplay;
		colHeaders.forEach(function(attr) {
			let treeCol = document.createElementNS(LDAPGroupsMemberDialog.XUL_NS, 'treecol');
			treeCol.setAttribute("id", attr);
			treeCol.setAttribute("anonid", attr);
			treeCol.setAttribute("label", attr);
			treeCol.setAttribute("flex", "1");
			treeCol.setAttribute("editable", "true");
			treeCol.setAttribute("width", "auto");
			treeCol.setAttribute("persist","width ordinal");
			treeCol.setAttribute("hidden","true");
			treeCol.setAttribute('onclick',"LDAPGroupsMemberDialog.sort(this)");
			myTreeCols.appendChild(treeCol);
			let splitter = document.createElementNS(LDAPGroupsMemberDialog.XUL_NS, 'splitter');
			splitter.setAttribute('class',"tree-splitter");
			splitter.setAttribute('anonid',"splitter");
			splitter.setAttribute("persist","ordinal");
			myTreeCols.appendChild(splitter);
		});
	},

	resolveStaticMembers: function (listener, idx) {
		try {
				if(! idx) idx = 0;		
				var statusDeck = document.getElementById('status-deck');
				if(idx >= listener.dns.length) {
					statusDeck.selectedIndex = 0;
					return;
				}
				statusDeck.selectedIndex = 3;	
				var progress = document.getElementById('staticMembersStatus');
				progress.value = (idx+1) + "/" + listener.dns.length;
				listener.idx = idx;
				var tmpDn = listener.dns[idx];
				//Components.utils.reportError('resolving stat member '+ tmpDn);
				LDAPGroupsMemberDialog.connection.search(tmpDn, 
					Components.interfaces.nsILDAPURL.SCOPE_BASE,  // SCOPE_BASE, SCOPE_ONELEVEL, SCOPE_SUBTREE
					"(objectclass=*)", 
					null/*attributesToDisplay*/, 
					listener);
		} catch(e){Components.utils.reportError(e);}
	},
	
	resolveDynamicMembers: function (listener, idx) {
	try {
		if(! idx) idx = 0;
		var statusDeck = document.getElementById('status-deck');
		if(idx >= listener.dns.length) {
			statusDeck.selectedIndex = 0;
			return;
		}
		statusDeck.selectedIndex = 3;
		listener.idx = idx;
		var tmpLdapUri = listener.dns[idx];
		//Components.utils.reportError('resolving dyn member '+ tmpLdapUri);
		var url = LDAPGroupsMemberDialog.ioService.newURI(tmpLdapUri, null, null).QueryInterface(Components.interfaces.nsILDAPURL);
		if(url.scope == Components.interfaces.nsILDAPURL.SCOPE_BASE) {
			LDAPGroupsMemberDialog.connection.search(url.dn, 
			url.scope,  // SCOPE_BASE, SCOPE_ONELEVEL, SCOPE_SUBTREE
			url.filter, 
			null/*attributesToDisplay*/, 
			listener);
		} else /*if (url.scope == Components.interfaces.nsILDAPURL.SCOPE_ONELEVEL)*/ {
			var tmp = {};
			tmp['member'] = url.spec;
			tmp['filter'] = url.filter;
			tmp['scope'] = url.scope;
			tmp['dn'] = url.dn;
			tmp['category'] = 'DYNAMIC';
			tmp['type'] = 'GROUP';
			LDAPGroupsMemberDialog.treeView.data.push(tmp);
			document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
			//resolveDynamicMembers(listener, idx+1);
			listener.onSearchResult(0);
		}
		} catch(e){Components.utils.reportError(e);}
	},

	// The view
	treeView: {
		treeBox: null,
		data: [],	
		//rowCount : 0,
		getCellText : function(row,column){
			try {
				return this.data[row][column.id];
			} catch(e) {
				Components.utils.reportError("ERROR: "+e);
				return 'N/A';
			}
		},
		get rowCount() {
			return this.data.length;
		},
		setTree: function(treebox){ this.treeBox = treebox; },
		isContainer: function(row){ return false; },
		isSeparator: function(row){ return false; },
		isSorted: function(row){ return false; },
		getLevel: function(row){ return 0; },
		getImageSrc: function(row,col){ 
			return null; 
		},
		getRowProperties: function(row,props){},
		getCellProperties: function(row,col,props){
			if(col.id != 'member') return "";
	
			var member = this.data[row];
			//var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);

			if(member['type'] == 'GROUP')  {
				//props.AppendElement(aserv.getAtom("group"));
				return "group";
			} else if(member['category'] == 'EXTERNAL')  {
				//props.AppendElement(aserv.getAtom("external"));
				return "external";
			} else  {
				//props.AppendElement(aserv.getAtom("user"));
				return "user";
			}
		},
		getColumnProperties: function(colid,col,props){},
		cycleHeader: function() {}
	},
	
	staticMemberSearchListener: {
		idx: 0,
		dns: null,
		onInit: function(pConn, pStatus) {},
		onBindResult: function(success) {},
		onSearchResult: function(errorCode) { 
			if(errorCode != 0) {
				var tmp = { 'dn' : this.dns[this.idx], 'category' :'STATIC', 'member': this.dns[this.idx]};
				LDAPGroupsMemberDialog.treeView.data.push(tmp);
				document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
			}
			LDAPGroupsMemberDialog.resolveStaticMembers(this, (this.idx)+1);
		},
		onSearchResultEntry: function(entry) {
			var tmp = LDAPGroupsMemberDialog.entryToBean(entry);
			tmp['category'] = 'STATIC';
	
			var group = LDAPGroupsMemberDialog.isGroup(tmp);
			if(group) {
				tmp['type'] = 'GROUP';
				tmp['filter'] = '(objectclass=*)';
				tmp['scope'] = Components.interfaces.nsILDAPURL.SCOPE_BASE;
			}
			LDAPGroupsMemberDialog.treeView.data.push(tmp);
			document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
		}
	},

	dynamicMemberSearchListener: {
		idx: null,
		dns: null,
		onInit: function(pConn, pStatus) {
			var statusDeck = document.getElementById('status-deck');
			statusDeck.selectedIndex = 1;
		},
		onBindResult: function(success) {
			if(! success) {
			var statusDeck = document.getElementById('status-deck');
			statusDeck.selectedIndex = 2;
			}
		},
		onSearchResult: function(errorCode) { 
			if((typeof(this.idx) != "undefined") && (this.idx!= null)) {
				if(errorCode != 0) {
					var tmp = { 'dn' : this.dns[this.idx], 'category' :'STATIC', 'member': this.dns[this.idx]};
					LDAPGroupsMemberDialog.treeView.data.push(tmp);
					document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
				}
				LDAPGroupsMemberDialog.resolveDynamicMembers(this, (this.idx)+1);
			} else {
				var statusDeck = document.getElementById('status-deck');
				statusDeck.selectedIndex = 0;
				if(errorCode != 0) {
					// TODO add status deck
					statusDeck.selectedIndex = 4;
					document.getElementById('errorCode').value = errorCode;
				}
			}
		},
		onSearchResultEntry: function(entry) {
			var tmp = LDAPGroupsMemberDialog.entryToBean(entry);
			tmp['category'] = 'DYNAMIC';
			var group = LDAPGroupsMemberDialog.isGroup(tmp);
			if(group) {
				tmp['type'] = 'GROUP';
				tmp['filter'] = '(objectclass=*)';
				tmp['scope'] = Components.interfaces.nsILDAPURL.SCOPE_BASE;
			}
			LDAPGroupsMemberDialog.treeView.data.push(tmp);
			LDAPGroupsMemberDialog.treeView.rowCount ++;
			document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
			
			if((typeof(this.idx) == "undefined") || (this.idx == null)){
				var memberCount = document.getElementById('memberCount');
				memberCount.value = LDAPGroupsMemberDialog.treeView.rowCount;
				var statusDeck = document.getElementById('status-deck');
				statusDeck.selectedIndex = 3;
			} else {
			//Components.utils.reportError(typeof(this.idx));
			}
		}
	},

	isGroup: function (tmp) {
		var res = false;
		for(i=0; i < tmp['objectclass'].length; i++) {
			tmp['objectclass'][i] = tmp['objectclass'][i].toLowerCase();
		}
		groupsObjectclasses.forEach(function(o) {
			if(tmp['objectclass'].indexOf(o.toLowerCase()) != -1)
				res = true;
		});
		return res;
	},
	entryToBean: function (entry) {
		var tmp = {};
		for(i in entry.attributes) {
			if('objectclass' == entry.attributes[i].attribute.toLowerCase()) {
				tmp[entry.attributes[i].attribute.toLowerCase()] = entry.attributes[i].values;//.join(',');
			} else {
				tmp[entry.attributes[i].attribute.toLowerCase()] = entry.attributes[i].values[0];
			}
		}
		// What to display
		for(i=0; i < attributesToDisplay.length; i++) {
			if(tmp[attributesToDisplay[i]] && (tmp[attributesToDisplay[i]]!= '')) {
				tmp['member'] = tmp[attributesToDisplay[i]];
				break;
			}
		}
		tmp['dn'] = entry.dn;
		return tmp;
	},
	
	groupListener: {
		staticMemberDns: [],
		dynamicMemberDns: [],
		externalMemberDns: [],
		onInit: function(pConn, pStatus) {
			var statusDeck = document.getElementById('status-deck');
			statusDeck.selectedIndex = 1;
		},
		onBindResult: function(success) {
			var statusDeck = document.getElementById('status-deck');
			statusDeck.selectedIndex = 2;
		},
		onSearchResult: function(errorCode) { 
			
			try {
			//Components.utils.reportError('ResultDone -> '+errorCode); 
			var myTree = document.getElementById('members-tree');
			myTree.view= LDAPGroupsMemberDialog.treeView;
	
			var total = this.staticMemberDns.length + this.dynamicMemberDns.length + this.externalMemberDns.length;
			var memberCount = document.getElementById('memberCount');
			memberCount.value = total;
			var statusDeck = document.getElementById('status-deck');
			if(total > 0) {
				statusDeck.selectedIndex = 3;
				LDAPGroupsMemberDialog.staticMemberSearchListener.dns = this.staticMemberDns;
				LDAPGroupsMemberDialog.resolveStaticMembers(LDAPGroupsMemberDialog.staticMemberSearchListener);
				LDAPGroupsMemberDialog.dynamicMemberSearchListener.dns = this.dynamicMemberDns;
				LDAPGroupsMemberDialog.dynamicMemberSearchListener.idx =  0;
				LDAPGroupsMemberDialog.resolveDynamicMembers(LDAPGroupsMemberDialog.dynamicMemberSearchListener);
			} else {
				statusDeck.selectedIndex = 0;
			}
			}catch(e){Components.utils.reportError(e);}
		},
		onSearchResultEntry: function(entry) {
			//Components.utils.reportError(' - ResultEntry  - '+entry.dn);
			var me = this;
			
			for(i in entry.attributes) {
				try {
				//Components.utils.reportError(' - attribute  - '+i);
				// If attribute is in static Members
				if(staticMembers.indexOf(entry.attributes[i].attribute.toLowerCase()) > -1) {
				
				entry.attributes[i].values.forEach(function(tmpDn) { 
						//Components.utils.reportError(' - satic member to resolve  - '+tmpDn);
						me.staticMemberDns.push(tmpDn);
				});
				} else if(externalMembers.indexOf( entry.attributes[i].attribute.toLowerCase()) > -1) {
					entry.attributes[i].values.forEach(function(rfc822) { 
						//Components.utils.reportError(' - rfc822  - '+rfc822);
						me.externalMemberDns.push(rfc822);
						var tmp = {};
						tmp['member'] = rfc822;
						tmp['mail'] = rfc822;
						tmp['category'] = 'EXTERNAL';
						LDAPGroupsMemberDialog.treeView.data.push(tmp);
						LDAPGroupsMemberDialog.treeView.rowCount ++;
						document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
					});
				} else if(dynamicMembers.indexOf( entry.attributes[i].attribute.toLowerCase()) > -1) {
					
					entry.attributes[i].values.forEach(function(tmpLdapUri) { 
						//Components.utils.reportError(' - dynamic member to resolve  - '+tmpLdapUri);
						me.dynamicMemberDns.push(tmpLdapUri);
					});
				}
			}catch(e){Components.utils.reportError(e);}
			}
		}
	},

	// LDAP Connection
	connection: new pLDAPConnection(),

	fetchGroupMembers: function (url, dn, password, groupDn, groupScope, groupFilter) {
		try {	
			this.connection.url = url;
			this.connection.bindDn = dn;
			this.connection.bindPassword = password;
			try {
					var statusDeck = document.getElementById('status-deck');
					statusDeck.selectedIndex = 1;
					if(groupScope != Components.interfaces.nsILDAPURL.SCOPE_BASE) {
					this.connection.search(groupDn, 
					  groupScope,  // SCOPE_BASE, SCOPE_ONELEVEL, SCOPE_SUBTREE
					  groupFilter, 
					  null/*staticMembers.concat(dynamicMembers).concat(externalMembers)*/, 
					  this.dynamicMemberSearchListener);
		
					} else { this.connection.search(groupDn, 
					  groupScope,  // SCOPE_BASE, SCOPE_ONELEVEL, SCOPE_SUBTREE
					  groupFilter, 
					  null/*staticMembers.concat(dynamicMembers).concat(externalMembers)*/, 
					  this.groupListener);
					}
			} catch(e){Components.utils.reportError(e);}
		} catch(e){Components.utils.reportError(e);}
	},

	sort: function (column) {
		try {
				var columnName;
				var treecol = column;
				var order = treecol.getAttribute("sortDirection") == "ascending" ? -1 : 1;
				//if the column is passed and it's already sorted by that column, reverse sort
				if (column) {
					columnName = column.id;
					if (treecol.getAttribute("sortResource") == columnName) {
						order *= -1;
					}
				} else {
					columnName = treecol.getAttribute("sortResource");
				}
				function columnSort(a, b) {
					if (LDAPGroupsUtils.prepareForComparison(a[columnName]) > LDAPGroupsUtils.prepareForComparison(b[columnName])) return 1 * order;
					if (LDAPGroupsUtils.prepareForComparison(a[columnName]) < LDAPGroupsUtils.prepareForComparison(b[columnName])) return -1 * order;
					//tie breaker: name ascending is the second level sort
					if (columnName != "name") {
						if (LDAPGroupsUtils.prepareForComparison(a["name"]) > LDAPGroupsUtils.prepareForComparison(b["name"])) return 1;
						if (LDAPGroupsUtils.prepareForComparison(a["name"]) < LDAPGroupsUtils.prepareForComparison(b["name"])) return -1;
					}
					return 0;
				}
				LDAPGroupsMemberDialog.treeView.data.sort(columnSort);
				var cols = document.getElementById('members-tree').getElementsByTagName("treecol");
				for (var i = 0; i < cols.length; i++) {
					cols[i].removeAttribute("sortDirection");
				}
				//setting these will make the sort option persist
				document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
				document.getElementById('members-tree').view = LDAPGroupsMemberDialog.treeView;
		} catch(e){Components.utils.reportError(e);}
	},

	OnViewMembers: function () {
		// Members dialog 
		if(window.arguments && (window.arguments[0]))  {
			var treeBox = document.getElementById('members-tree');
			var itemIdx = LDAPGroupsUtils.getSelectedItem(treeBox)[0];
			var item = LDAPGroupsMemberDialog.treeView.data[itemIdx];
			params = window.arguments[0];
			params.groupDn = item.dn;
			params.groupFilter = item.filter;
			params.groupScope = item.scope;
		} else { // Main addressbook panel
			return;
		}
		window.openDialog('chrome://ldap-groups/content/members-dialog.xul', 
											   "", 'centerscreen=yes,chrome,resizable,modal', params);
	}
};