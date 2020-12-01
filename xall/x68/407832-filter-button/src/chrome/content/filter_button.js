Components.utils.import("chrome://filter_button/content/filter_button_shared.jsm");

var filter_button={
		init:function(){
			var messagepane = document.getElementById("messagepane");
			if(messagepane)
				messagepane.addEventListener("load", filter_button.updateButton, true);
			window.addEventListener("activate", filter_button.updateButton, true);
		},

		matching_filters:[],

		/**
		 * Find all message filters for the current folder
		 * @returns {Array} of objects {filter:nsIMsgFilter, terms:{Array of objects}}
		 */
		getFilters:function(){
			var msg=gFolderDisplay.selectedMessage;
			if(!msg)
				return;

			var msgFolder = msg.folder;


			var curFilterList = msgFolder.getFilterList(msgWindow);

			filter_button.DLOG("Filter count is " + curFilterList.filterCount);
			var filters=[];

			for (var i = 0; i < curFilterList.filterCount; i++)
			{
				var curFilter = curFilterList.getFilterAt(i);
				if (/*curFilter.enabled &&*/ !curFilter.temporary) //Also show disabled filters
				{
					filter_button.DLOG("Name: "+curFilter.filterName);
					var terms=[];
					for(var j=0; j<100; j++){
						var attrib={}, op={}, value={}, booleanAND={}, arbitraryHeader={};
						curFilter.GetTerm(j, attrib, op, value, booleanAND, arbitraryHeader);
						if(attrib.value===0 && op.value===0 && value.value===null)
							break; //No more terms

						terms.push({
							attrib:attrib.value,
							op:op.value,
							value:value.value,
							booleanAnd:booleanAND.value,
							arbitraryHeader:arbitraryHeader.value
						});
					}
					var newFilter={filter:curFilter, terms:terms};
					filter_button.DLOG(newFilter);
					filters.push(newFilter);
				}
			}
			return filters;
		},

		/**
		 * Tests whether a filter matches a msg
		 * @param filter {filter:nsIMsgFilter, terms:[]}
		 * @param msg nsIMsgDbHdr
		 * @returns true/false
		 */
		filterMatches:function(filter, msg){
			if(!msg || !filter)
				return false;

			var session =Components.classes["@mozilla.org/messenger/searchSession;1"].createInstance(Ci.nsIMsgSearchSession);
			session.addScopeTerm(Ci.offlineMailFilter, msg.folder);

			for(var i =0; i < filter.terms.length; i++){
				var term=filter.terms[i];
				session.addSearchTerm(term.attrib, term.op, term.value,
						filter.terms[0].booleanAnd,//Use the booleanAnd value of the first filter - thunderbird sometimes seems to write wrong values to booleaAnd of other filters
						term.arbitraryHeader);
			}

			return session.MatchHdr(msg, msg.folder.msgDatabase);


			/*
			 * Manual Matching:
			var matched=false;
			for(var i =0; i < filter.terms.length; i++){
				var term=filter.terms[i];
				var retval=filter_button.termMatches(term,msg);
				if(term.booleanAnd && !retval)
					return false;
				if(!term.booleanAnd && retval)
					return true;
				matched|=retval;
			}
			return matched;*/
		},


		/**
		 * updates the filter button
		 * @param event
		 */
		updateButton:function(){
			var start=new Date().getTime();
			var button = document.getElementById("filter_button-button-1");
			if(!button)
				return; //Nothing to be done
			if(!gFolderDisplay)
				return;
			var msg=gFolderDisplay.selectedMessage;
			if(!msg){
				button.enabled=false;
				return;
			}

			var stringBundle=document.getElementById("filter_button-stringbundle");

			button.enabled=true;

			var filters=filter_button.getFilters();
			var update=new Date().getTime();

			var matchingFilters=[];

			for(var i =0; i < filters.length; i++){
				if(filter_button.filterMatches(filters[i], msg))
					matchingFilters.push(filters[i]);
			}
			filter_button.matching_filters=matchingFilters;

			var evaldone=new Date().getTime();

			if(matchingFilters.length==0){
				button.label=stringBundle.getString('EmptyButtonLabel');
				button.type='button';
				button.classList.add('filter_button_no_filters');
				button.tooltipText=stringBundle.getString('NoFilterTooltip');
			}
			else if(matchingFilters.length==1){
				button.type='button';
				button.label=matchingFilters[0].filter.filterName;
				button.classList.remove('filter_button_no_filters');
				button.tooltipText=stringBundle.getString('FilterTooltip');
			}
			else{
				button.type='menu';
				button.label=stringBundle.getString('MultipleFiltersButtonLabel');
				button.classList.remove('filter_button_no_filters');
				button.tooltipText=stringBundle.getString('MultipleFiltersTooltip');
				var popup=document.getElementById("filter_button-button-1-menupopup");
				while(popup.firstChild)
					popup.removeChild(popup.firstChild);
				for ( var i = 0 ; i < matchingFilters.length ; i++ ) {
					var filter=matchingFilters[i];
					var newMenuItem = document.createElement("menuitem");
					newMenuItem.setAttribute("label", filter.filter.filterName);
					(function(i){
						newMenuItem.addEventListener("command", function(){filter_button.runMultiFilter(i);});
					})(i);

					popup.appendChild(newMenuItem); // appends new menuitem to button context menu
				}
			}

			var done=new Date().getTime();
			filter_button.DLOG("UpdateF in "+(update-start)+" ms, eval in "+(evaldone-update)+" ms, complete in "+(done-start)+"ms");
		},

		runMultiFilter:function(i){
			var filter=filter_button.matching_filters[i];
			filter_button.runFilter(filter.filter);
		},

		runSingleFilter:function(){
			if(filter_button.matching_filters.length>1)
				return;
			if(filter_button.matching_filters.length<1){
				filter_button_shared.create_filter=true;
				goDoCommand('cmd_createFilterFromMenu');
				return;
			}
			filter_button.runFilter(filter_button.matching_filters[0].filter);
		},

		/**
		 * Runs the given filter on the currently selected message
		 * @param filter a nsIMsgFilter
		 */
		runFilter:function(filter){
			var msg=gFolderDisplay.selectedMessage;
			var filterService = Components.classes["@mozilla.org/messenger/services/filters;1"].getService(Components.interfaces.nsIMsgFilterService);
			var folder = msg.folder;
			var tempFilterList = filterService.getTempFilterList(folder);

			var msgList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			msgList.appendElement(msg, false);

			var curFilterList = folder.getFilterList(msgWindow);

			// make sure the tmp filter list uses the real filter list log stream
			tempFilterList.logStream = curFilterList.logStream;
			tempFilterList.loggingEnabled = curFilterList.loggingEnabled;
			tempFilterList.insertFilterAt(0, filter_button.createDummyFilterClone(filter, tempFilterList));

			//temporarily switch filter lists
			folder.setFilterList(tempFilterList);
			try{
				filter_button.LOG("Running filter '"+filter.filterName+"' on message '"+msg.mime2DecodedSubject+"'");
				filterService.applyFilters(Components.interfaces.nsMsgFilterType.All, msgList, folder, msgWindow);
				filter_button.LOG("Done running filter");
			}
			finally{
				folder.setFilterList(curFilterList);
			}
		},

		/**
		 * Creates a clone of a given filter without any filter terms
		 * @param filter the filter to be cloned
		 * @param filterList the filterlist which should "own" the new filter
		 * @returns a clone of the filter without any terms
		 */
		createDummyFilterClone:function(filter, filterList){
			var retval=filterList.createFilter(filter.filterName);
			retval.filterType=filter.filterType;
			retval.temporary=true;
			retval.enabled=true;
			retval.filterDesc=filter.filterDesc;
			retval.filterList=filterList;
			retval.scope=filter.scope;
			var nrActions=filter.actionCount;
			for(var i =0; i < nrActions; i++)
				retval.appendAction(filter.getActionAt(i));
			return retval;
		},
		LOG:function(msg) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
			var str=msg;
			if(typeof msg == 'object'){
				var objToString=function(obj, depth){
					if(obj+'' == '[object Object]' ||(typeof(obj)=='object'&&(obj instanceof Array))){
						var str=obj+" {";
						for(var key in obj){
							if(obj.hasOwnProperty(key)){
								str+="\n";
								for(var i =0; i < depth; i++)
									str+="\t";
								str+=" ["+key+"]=["+objToString(obj[key], depth+1)+"]";
							}
						}
						return str+"}";
					}
					return obj;
				};
				str=" "+objToString(msg,0);
			}

			consoleService.logStringMessage(str);
		},

		DLOG:function(msg){
			//filter_button.LOG(msg);
		}
};



window.addEventListener("load", function load(e) {
	window.removeEventListener("load", load, false); //remove listener, no longer needed

	var _prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
	var firstRunPref="extensions.filter_button.firstRun";
	var firstRun=_prefService.getBoolPref(firstRunPref);
	if(firstRun){
		_prefService.setBoolPref(firstRunPref, false);

		/**
		 * Installs the toolbar button with the given ID into the given
		 * toolbar, if it is not already present in the document.
		 *
		 * @param {string} toolbarId The ID of the toolbar to install to.
		 * @param {string} id The ID of the button to install.
		 * @param {string} afterId The ID of the element to insert after. @optional
		 */
		var installButton = function(toolbarId, id, afterId) {
		    if (!document.getElementById(id)) {
		        var toolbar = document.getElementById(toolbarId);

		        // If no afterId is given, then append the item to the toolbar
		        var before = null;
		        if (afterId) {
		            let elem = document.getElementById(afterId);
		            if (elem && elem.parentNode == toolbar)
		                before = elem.nextElementSibling;
		        }

		        toolbar.insertItem(id, before);
		        toolbar.setAttribute("currentset", toolbar.currentSet);
		        document.persist(toolbar.id, "currentset");

		        if (toolbarId == "addon-bar"){
		            toolbar.collapsed = false;
		        }
		    }
		};

	    installButton("header-view-toolbar", "filter_button-button-1");
	}

	filter_button.init();
}, false);
