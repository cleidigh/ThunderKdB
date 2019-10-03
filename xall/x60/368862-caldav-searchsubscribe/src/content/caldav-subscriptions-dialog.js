/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sun Microsystems code.
 *
 * The Initial Developer of the Original Code is Sun Microsystems.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   diesmo <partoche@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
/**
 * Sets up the subscriptions dialog.
 */
function onLoad() {
    opener.setCursor("auto");
	populateCalendarMenulist();
	
	logIt(onAccept);
}

function getSelectedCalendarUri() {
   var result;
   var cal = document.getElementById("calendars-menulist").selectedItem;
   if(cal)
     result = cal['calObject'].uri;
   return result;
}

onSearch = onPrincipalSearch;
/**
 * Handler function to be called when searching for a calendar User (owner, principal)
 */
function onPrincipalSearch() {
    cancelPendingSearchOperation();
	
	var discoverOwnCalendars = document.getElementById('discover-own-calendars').checked;
	if ( ! discoverOwnCalendars) {
		var searchString = document.getElementById("search-textbox").value;
		if(!searchString) return;
	}

	var richListBox = document.getElementById('principals-listbox');
	richListBox.clear();
	var richListBox = document.getElementById('subscriptions-listbox');
	richListBox.clear();
	
	var uri = getSelectedCalendarUri();
	if(!uri) return;
	
	var statusDeck = document.getElementById("status-deck");
	var searchResultCount = document.getElementById("search-result-count");
	var statusCodeLabel = document.getElementById("caldav-statuscode");
	
	var opListener = {
	
	   results: [],
	
	   onResult: function(result) {
          if (result) {
              for (let principalInfo of result) {
			    this.results.push(principalInfo);
			  }
          }
      },
	  onError: function(statusCode) {
	    statusDeck.selectedIndex = 4;
		statusCodeLabel.setAttribute("value", statusCode);
	  },

	  onFinish: function() {
	    var richListBox = document.getElementById('principals-listbox');
		  var showGroups = document.getElementById('search-show-groups').checked;
			if(this.results.length > 0) {
			  this.results.sort(  function(a, b){ 
									if(a.displayName.toLowerCase() < b.displayName.toLowerCase()) 
										return -1; 
									else 
										return 1; 
								   } 
							    );
			  for (let principalInfo of this.results) {
                  let tmp = richListBox.addPrincipal(principalInfo);
				  if(tmp.type == 'GROUP')
				  {
					tmp.setAttribute("observes", "groupVisibility");
				  }
              }
			}
			var richListBox = document.getElementById('principals-listbox');
			if (richListBox.getRowCount() > 0) {
                  statusDeck.selectedIndex = 3;
				  searchResultCount.setAttribute("value", richListBox.getRowCount());
            } else {
                statusDeck.selectedIndex = 2;
            }
	  }
  };
  statusDeck.selectedIndex = 1;
	if (discoverOwnCalendars) {
	  getCalendarHomeSetURI(uri,"String COULD be used for filtering in results", opListener);
	} else {
	  searchPrincipal(uri,searchString, opListener);
	}
}

function onShowGroups(show) {
	var groupVisibility = document.getElementById('groupVisibility');
    groupVisibility.setAttribute("hidden", show);
}

function onSearchMyCalendars(checked) {
    var searchTextbox = document.getElementById('search-textbox');
    searchTextbox.disabled = !checked;
}

function onPrincipalSelection() {
  var principalListBox = document.getElementById('principals-listbox');
  var getCalendarsButton = document.getElementById('getcalendars-button');
  var item = principalListBox.selectedItem;
  if(!item) return;
  
  if(item.type == 'GROUP') {
	getCalendarsButton.disabled = true;
  } else{
    getCalendarsButton.disabled = false;
  }
}

/**
 * Handler function to be called when searching for calendars available at one's calendarHome
 */
function onCalendarSearch() {
	var principalListBox = document.getElementById('principals-listbox');
	var item = principalListBox.selectedItem;
	
	if(!item) return;	
	cancelPendingSearchOperation();	
	var richListBox = document.getElementById('subscriptions-listbox');
	richListBox.clear();
	
	var uri = getSelectedCalendarUri();
	if(!uri) return;
	
	var registeredCals = {};
	var registeredCalIds = {}
	for  (let cal2 of cal.getCalendarManager().getCalendars({})) {
      registeredCals[cal2.uri.spec] = true;
	  registeredCalIds[cal2.uri.spec] = cal2.id;
    }

	var statusDeck = document.getElementById("status-deck");
	var statusCodeLabel = document.getElementById("caldav-statuscode");
	
	var opListener = {
		
		onError: function(statusCode) {
		  if (statusCode == '404') { // No calendar, or no calendar i have the right to see
		    statusDeck.selectedIndex = 2;
		  } else {
		    statusDeck.selectedIndex = 4;
		    statusCodeLabel.setAttribute("value", statusCode);
		  }
		},
	
        onResult: function(result) {
          if (result) {
            for  (let c of result) {			  
			  let newCal =  cal.getCalendarManager().createCalendar('caldav', c.uri);
			  newCal.name = c.name;
			  
			  
			  var isSubscribed = false;
			  var calUri = c.uri.spec;
			  var calUriNoSlash = removeTrailingSlash(calUri);
			  if(registeredCalIds[calUri]) {
			    newCal['id'] = registeredCalIds[c.uri.spec];
				var isSubscribed = true;
			  } else if(registeredCalIds[calUriNoSlash]) {
			    newCal['id'] = registeredCalIds[calUriNoSlash];
				var isSubscribed = true;
			  } else {
				newCal.readOnly = true;
			    newCal.setProperty('color', c.color);
			    newCal.setProperty('suppressAlarms', true);
			    newCal.setProperty('imip.identity.key', '');  
			  }
              richListBox.addCalendar(newCal, isSubscribed, c.privileges);
            }
         }
        },
		
		onFinish: function() {
		   var richListBox = document.getElementById('subscriptions-listbox');
		   var statusDeck = document.getElementById("status-deck");
           if (richListBox.getRowCount() > 0) {
             statusDeck.selectedIndex = 0;
           } else {
             statusDeck.selectedIndex = 2;
           }
		}
  };
  searchCalendarHome(uri, item.calendarHomeSet, opListener);
}

function populateCalendarMenulist() {
	var menuList = document.getElementById('calendars-menulist');	 
	var menuPopup = menuList.menupopup;	 
	var calendars = cal.getCalendarManager().getCalendars({});
	calendars.forEach(function(cal) {
		if( ((cal.type == 'caldav') || (cal.type == 'caldav-query') || (cal.type == 'caldav-lite'))&& (!cal.getProperty("disabled") )) {
			if(cal.getProperty("currentStatus") == 0) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", cal.name);
				menuItem.setAttribute("tooltiptext", cal.name);
				menuItem["calObject"] = cal;
				menuPopup.appendChild(menuItem);
			}
		}	
	});
	if((menuList.itemCount > 0) && (menuList.selectedIndex == -1)) {
	  menuList.selectedIndex = 0;
	} else {
	  var statusDeck = document.getElementById("status-deck");
	  statusDeck.selectedIndex = 5;
	}
}
