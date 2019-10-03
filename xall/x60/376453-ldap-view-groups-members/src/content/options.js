var gPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

var groupsObjectclasses = [];

try {
  groupsObjectclasses = gPrefs.getCharPref("ldapgroups.group.objectclasses").split(',');
  for(i=0; i < groupsObjectclasses.length; i++){
		groupsObjectclasses[i] = groupsObjectclasses[i].replace(' ', '').toLowerCase();
  }
} catch(e){
}

// Config
var staticMembers = [];
try {
  staticMembers = gPrefs.getCharPref("ldapgroups.members.static").split(',');
  for(i=0; i < staticMembers.length; i++){
		staticMembers[i] = staticMembers[i].replace(' ', '').toLowerCase();
  }
} catch(e){
}


var dynamicMembers = [];
try {
  dynamicMembers = gPrefs.getCharPref("ldapgroups.members.dynamic").split(',');
  for(i=0; i < dynamicMembers.length; i++){
		dynamicMembers[i] = dynamicMembers[i].replace(' ', '').toLowerCase();
  }
} catch(e){
}


var externalMembers = [];
try {
  externalMembers = gPrefs.getCharPref("ldapgroups.members.external").split(',');
  for(i=0; i < externalMembers.length; i++){
		externalMembers[i] = externalMembers[i].replace(' ', '').toLowerCase();
  }
} catch(e){
}

// What to display for a member
var attributesToDisplay = [];
try {
  attributesToDisplay = gPrefs.getCharPref("ldapgroups.members.attributes").split(',');
  for(i=0; i < attributesToDisplay.length; i++){
		attributesToDisplay[i] = attributesToDisplay[i].replace(' ', '').toLowerCase();
  }
} catch(e){
}