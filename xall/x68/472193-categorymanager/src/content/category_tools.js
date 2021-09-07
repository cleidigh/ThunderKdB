var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

//create jbCatMan namespace
var jbCatMan = {};

jbCatMan.quickdump = function (str) {
    Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("[CatMan] " + str);
}







jbCatMan.getLocalizedMessage = function (msg, replacement = "") {
  let localized = msg;
  try {
    localized = jbCatMan.extension.localeData.localizeMessage(msg).replace("####", replacement);
  } catch (e) {
    Components.utils.reportError(e);    
  }
  
  return localized;
}



jbCatMan.init = function () { 
  //enable or disable debug dump messages
  jbCatMan.printDumps = false;
  jbCatMan.printDumpsIndent = " ";

  jbCatMan.printDebugCounts = Array();
  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
  
  jbCatMan.eventUpdateTimeout = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);

  //locale object to store names from locale file
  jbCatMan.locale = {};

  //data object for bulkedit dialog
  jbCatMan.bulk = {};
  
  //data object for category data
  jbCatMan.data = {};
  
  //mainly managed by jbCatMan.scanCategories()
  jbCatMan.data.categoryMembers = [];
  jbCatMan.data.categoryList = [];
  jbCatMan.data.abSize = 0;
  //create a map between directoryIds und abURI, so we can get the abURI for each card even if its directory is not known when using the global address book
  jbCatMan.data.abURI = {};
}


/*
  Get the parent book, if it is a mailinglist
*/
jbCatMan.getParentAb = function(book) {
  if (book.isMailList) {
    return MailServices.ab.getDirectory(GetParentDirectoryFromMailingListURI(book.URI));
  } else {
    return book;
  }
}

/* 
  Save a given card using the internal mapping between the directoryId (attribute of card) 
  and directoryURI, so all cards can be modified, even if the directoryURI is not known. 
*/
jbCatMan.modifyCard = function (card) {
  if (card.directoryUID == "") {
      if (!uri || uri == "moz-abdirectory://?") {
         throw { name: "jbCatManException", message: "Found card without directoryId.", toString: function() { return this.name + ": " + this.message; } };
      }
  } else {
    //save card changes
    let abUri = jbCatMan.data.abURI[card.directoryUID];
    let ab = jbCatMan.getParentAb(MailServices.ab.getDirectory(abUri));
    ab.modifyCard(card);
  }
}




//##############################################
// UI related functions
//##############################################

// Using categoryFilter to be able to distinguish between "none", "all" and
// any other value and to be able to actually display multiple categories,
// if that gets implemented.
jbCatMan.updatePeopleSearchInput = function (categoryFilter) {
  if (Array.isArray(categoryFilter) && categoryFilter.length > 0) {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + categoryFilter[categoryFilter.length-1];
    
  } else if (categoryFilter == "uncategorized") {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + jbCatMan.getLocalizedMessage("viewWithoutCategories");
    
  } else {
    document.getElementById("peopleSearchInput").value = "";
    
  }
}


jbCatMan.getReducedCategoriesForHierarchyMode = function (parentCategory = null) {
  let reducedCategories = [];
  
  let level = parentCategory ? parentCategory.split(" / ").length + 1 : 1;
  for (let cat of jbCatMan.data.categoryList) {
    let thisLevel = cat.split(" / ");      
    thisLevel.splice(level);
    thisLevel = thisLevel.join(" / "); 
    
    if ((!parentCategory || thisLevel.startsWith(parentCategory + " / ")) && !reducedCategories.includes(thisLevel)) {
      reducedCategories.push(thisLevel);
    }
  }

  return reducedCategories;
}

jbCatMan.getSubCategories = function (parentCategory) {
  let subCategories = [];
  for (let category of jbCatMan.data.categoryList) {
    // Do not include parentCategory.
    if (category.startsWith(parentCategory + " / ")) subCategories.push(category);
  }
  subCategories.sort();
  return subCategories;
}

jbCatMan.getUriAndSearch = function (searchUri) {
    const globalAbURi = "moz-abdirectory://?";
    
    let cutOff = (searchUri.startsWith(globalAbURi))
      ? globalAbURi.length
      : searchUri.indexOf("?");
    
    if (cutOff < 0) {
      cutOff = searchUri.length;
    }
    
    let uri = searchUri.substring(0, cutOff);
    let search = searchUri.substring(cutOff + 1);
    return { uri, search };
}

jbCatMan.searchDirectory = function (searchUri) {
  return new Promise((resolve, reject) => {
    let listener = {
      cards : [],
      
      onSearchFinished(status, complete, secInfo, location) {
        resolve(this.cards);
      },
      onSearchFoundCard(aCard) {
        let card = aCard.QueryInterface(Components.interfaces.nsIAbCard);
        this.cards.push(card);
      }
    }
    
    let {uri, search } = jbCatMan.getUriAndSearch(searchUri);
    if (search) {
      MailServices.ab.getDirectory(uri).search(search, "", listener);
    } else {
      let result = MailServices.ab.getDirectory(uri).childCards;
      resolve(result);
    }
  });
}

jbCatMan.sleep = function (delay) {
  let timer =  Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
  return new Promise(function(resolve, reject) {
    let event = {
      notify: function(timer) {
        resolve();
      }
    }
    timer.initWithCallback(event, delay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  });
}

jbCatMan.getNumberOfFilteredCards = async function (abURI, categoryFilter) {
  let searchstring = jbCatMan.getCategorySearchString(abURI, categoryFilter);
  let searches = jbCatMan.getSearchesFromSearchString(searchstring);

  let length = 0;
  for (let search of searches) {
    let cards = await jbCatMan.searchDirectory(search);
    length += cards.length;
  }
  return length;    
}


jbCatMan.getCategorySearchString = function(abURI, categoryFilter) {
    //Filter by categories - http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbQueryStringToExpression.cpp#278
    let searchstring = "";

    if (Array.isArray(categoryFilter)) {

      // encodeURIComponent does NOT encode brackets "(" and ")" - need to do that by hand
      let sep = jbCatMan.getCategorySeperator();
      let field = jbCatMan.getCategoryField();
      let searchCats = [];
      
      for (let category of categoryFilter) {
        let searchFields = [];
        searchFields.push("("+field+",bw,"+encodeURIComponent( category + sep ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",ew,"+encodeURIComponent( sep + category ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",c,"+encodeURIComponent( sep + category + sep ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",=,"+encodeURIComponent( category ).replace("(","%28").replace(")","%29") +")");
        searchCats.push("(or" + searchFields.join("") + ")");
      }
      searchstring =  abURI + "?" + "(or" + searchCats.join("") + ")";

    } else if (categoryFilter == "uncategorized") {
      searchstring =  abURI + "?" + "(or("+jbCatMan.getCategoryField()+",!ex,''))";
      
    } else {
      searchstring = abURI;
      
    }
    
    return searchstring;
}

jbCatMan.getSearchesFromSearchString = function(searchstring) {
  let searches = [];
  if (searchstring.startsWith("moz-abdirectory://?")) {
    searchstring = searchstring.substring(19);
    let allAddressBooks = MailServices.ab.directories;
    for (let abook of allAddressBooks) {
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        searches.push(abook.URI + searchstring);
       }
    }
  } else {
      searches.push(searchstring);
  }
  return searches;
}

jbCatMan.doCategorySearch = function (categoryFilter) {
  let abURI = GetSelectedDirectory();

  if (document.getElementById("CardViewBox") != null) {
    ClearCardViewPane();
  }

  //update results pane based on selected category 
  let searchString = jbCatMan.getCategorySearchString(abURI, categoryFilter);
  // SetAbView now takes two parameters, the abURL and the search parameter
  let {uri, search } = jbCatMan.getUriAndSearch(searchString);
  SetAbView(uri, search);

  if (document.getElementById("CardViewBox") != null) {
    SelectFirstCard();  
  }
  
  jbCatMan.updatePeopleSearchInput(categoryFilter);
}





//##############################################
// cards related functions
//##############################################

jbCatMan.getUIDFromCard = function (card) {
  return card.UID;
}

jbCatMan.getCardFromUID = async function (UID, abURI) {
  let allCards = await jbCatMan.searchDirectory(abURI);
  let filteredCards = allCards.filter(c => c.UID == UID);

  if (filteredCards.length > 0) {
    return filteredCards[0];
  } else { 
    return null
  }
}



jbCatMan.moveCategoryBetweenArrays = function (category, srcArray, dstArray) {
    let removedCats = [];

    //remove from srcArray
    let startAt = (category == "") ? 0 : srcArray.indexOf(category);
    let howmany = (category == "") ? srcArray.length : 1;
    while (startAt != -1) {
        removedCats = srcArray.splice(startAt, howmany); //returns an array with the removed cat - if a single cat is present multiple times, we still get an array with only one entry (it gets overwritten)
        startAt = srcArray.indexOf(category);
    }

    //add all removed cats to dstArray 
    for (let i=0; i<removedCats.length; i++) {
        if (dstArray.indexOf(removedCats[i]) == -1) dstArray.push(removedCats[i]);
    }
}

jbCatMan.getCategorySeperator = function () {
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
  return prefs.getCharPref("extensions.sendtocategory.seperator");
}

jbCatMan.getCategoryField = function () {
  return "Categories";
}


jbCatMan.getCategoriesFromString = function(catString, seperator = jbCatMan.getCategorySeperator()) {
  let catsArray = [];
  if (catString.trim().length>0) catsArray = catString.split(seperator).filter(String);
  catsArray.sort();
  
  // Sanity check: Do not include parents.
  return catsArray.filter((e, i, a) => (i == (a.length-1)) || !a[i+1].startsWith(e + " / "));
}

jbCatMan.getStringFromCategories = function(catsArray, seperator = jbCatMan.getCategorySeperator()) {
  if (catsArray.length == 0) return "";
  else {
    let checkedArray = [];
    for (let i = 0; i < catsArray.length; i++) {
      if (catsArray[i] && catsArray[i] != "" && checkedArray.indexOf(catsArray[i]) == -1) {
        checkedArray.push(catsArray[i]);
      }
    }
    return checkedArray.join(seperator);
  }
}

jbCatMan.getCategoriesfromCard = function (card, field = jbCatMan.getCategoryField()) {
  let catString = "";
  try {
    catString = card.getPropertyAsAString(field);
  } catch (ex) {}
  let catsArray = jbCatMan.getCategoriesFromString(catString, jbCatMan.getCategorySeperator());
  return catsArray;
}

jbCatMan.setCategoriesforCard = function (card, catsArray,  field = jbCatMan.getCategoryField()) {
  let retval = true;

  // Sanity check: Skip mailing lists.
  if (card.isMailList)
    return false;
  
  // Sanity check: Do not include parents.
  let catsString = jbCatMan.getStringFromCategories(catsArray.filter((e, i, a) => (i == (a.length-1)) || !a[i+1].startsWith(e + " / ")), jbCatMan.getCategorySeperator());

  try {
     card.setProperty(field, catsString);
  } catch (ex) {
    retval = false;
  }
  return retval;
}



jbCatMan.getEmailFromCard = function (card) {
  if (card.primaryEmail) return card.primaryEmail
  else {
    let email = "";
    try {
      email = card.getPropertyAsAString("SecondEmail");
    } catch (ex) {}
    return email;
  }
}



jbCatMan.getUserNamefromCard = function (card) {
  let userName = "";
  let fallback = jbCatMan.locale.bulkEditNoName;
  // if no name is present, but an email, use the first part of the email as fallback for name - this is how TB is doing it as well
  if (card.primaryEmail) fallback = card.primaryEmail.split("@")[0];
  
  try {
      userName = card.getPropertyAsAString("DisplayName"); 
  } catch (ex) {}
  if (userName == "") try {
      userName = card.getPropertyAsAString("FirstName") + " " + card.getPropertyAsAString("LastName");
  } catch (ex) {}
  if (userName == "") userName = fallback;

  return userName;
}

jbCatMan.updateCategories = function (mode, oldName, newName) {
  //get address book manager
  let addressBook = MailServices.ab.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself
  let cards = addressBook.childCards;

  for (let card of cards) {
    let catArray = jbCatMan.getCategoriesfromCard(card);
    let rebuildCatArray = [];
    if (catArray.length > 0) {  
      let writeCategoriesToCard = false;
      for (let i=0; i < catArray.length; i++) {        
        if (catArray[i] == oldName || catArray[i].startsWith(oldName + " / ")) { // Act upon this category and all sub categories.

          // Perform remove or rename action.
          if (mode == "rename") {
            // oldName and newName include the full hierarchy
            writeCategoriesToCard = true;
            catArray[i] = catArray[i].replace(oldName, newName);
          } else if (mode == "remove") {
            //put the card into the parent of oldname
            writeCategoriesToCard = true;
            let parent = oldName.split(" / ").slice(0, -1).join(" / ");
            if (parent) {
              catArray[i] = parent;
            } else {
              continue;
            }
          }
        }
        
        // It is easier to build a new array, instead of deleting an entry out of an array, which is being looped.
        rebuildCatArray.push(catArray[i]);
      }
      
      
      // Was there a manipulation of the card due to rename or delete request?
      if (writeCategoriesToCard) {
        jbCatMan.setCategoriesforCard(card, rebuildCatArray)
        jbCatMan.modifyCard(card);
      }
    }
  }
}



jbCatMan.scanCategories = function (abURI, field = jbCatMan.getCategoryField(), quickscan = false) {
  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the category array is constantly cleared and build from scan results
  let data = {};
  if (quickscan === false) data = jbCatMan.data;

  data.categoryMembers = [];
  data.categoryList = [];
  data.abSize = 0;
  data.abURI = {};
  data.cardsWithoutCategories = [];
    
  // scan all addressbooks, if this is the new root addressbook (introduced in TB38)
  // otherwise just scan the selected one
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let addressBooks = jbCatMan.getSearchesFromSearchString(abURI);

  for (var l = 0; l < addressBooks.length; l++) {
    let addressBook = null;
    if (addressBooks[l]) addressBook = MailServices.ab.getDirectory(addressBooks[l]); //addressBooks contains URIs, but we need the directory itself
    else continue;

    /* Skip LDAP directories: They are never loaded completely, but just those contacts matching a search result.
       If only those are scanned, the user never knows, if a listed category contains all category members or not.
       The function "send email to category" is rendered useless. */
    if (addressBook.isRemote) continue;

    let cards = addressBook.childCards;
    for (let card of cards) {
      data.abSize++;

      //Keep track of mapping between directoryID and abURI, to get the owning AB for each card
      if (!data.abURI.hasOwnProperty(card.directoryUID)) {
        data.abURI[card.directoryUID] = addressBook.URI;
      }

      let catArray = jbCatMan.getCategoriesfromCard(card, field);
      let CardID = jbCatMan.getUIDFromCard(card);
      if (catArray.length > 0) {
        //add card to all categories it belongs to
        for (let i=0; i < catArray.length; i++) {
          let catParts = catArray[i].split(" / ");
          
          for (let i=0; i < catParts.length; i++) {
            let cat = catParts.slice(0,i+1).join(" / ");
            //is this category known already?
            if (!data.categoryList.includes(cat)) {
              data.categoryList.push(cat);
              //categoryMembers is using Strings as Keys
              data.categoryMembers[cat] = [];
            }            
            
            //add card to category
            data.categoryMembers[cat].push(CardID);
          }
          
        }
      } else {
        data.cardsWithoutCategories.push(CardID);
      }
    }
  }
  data.categoryList.sort();
  return data.categoryList;
}




//###################################################
// override global functions
//###################################################

/********************************************************************************
 SelectFirstCard() seems to be broken.
********************************************************************************/
SelectFirstCard = function() {
  if (gAbView && gAbView.selection && gAbView.rowCount > 0) gAbView.selection.select(0);
}



//init data object
jbCatMan.init();
