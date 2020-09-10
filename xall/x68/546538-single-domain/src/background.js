
// Intercepts send and checksaddresses against prefs
//These variables are for the expansion of mailingLists
var ToolbarTitle = browser.i18n.getMessage("toolbartitle");
var TabID;
var NewTo = [];
var NewCC = [];
var NewBCC = [];
var DetailsToSend = {};
var domainExclude;
var versionHeader;
// Retrieve the stored prefs, or initialise them
// Same code here and in prefs.js

async function  tryManagedPrefs() {
try {
    var Thisdomain = await browser.storage.managed.get("domain");
    var ThisVersion = await browser.storage.managed.get("version");
    console.log("Managed preferences: " + Thisdomain.domain + " " + ThisVersion.version);
    domainExclude = Thisdomain.domain;
    versionHeader = ThisVersion.version;
    //console.log("domainExclude 1 " + domainExclude);
  } catch (e) {
    throw error;
 }
}

let prefs = new Object()
tryManagedPrefs().then(GetPrefs,GetPrefs)

function GetPrefs() {
  // To look in local storage
//console.log("domainExclude 2 " + domainExclude + " " + versionHeader);
   let gettingItem = browser.storage.local.get('prefs');
   gettingItem.then(onGot, onError);
}
function onGot(item) {
// Prefs found in local storage
  console.log("Initial item " + JSON.stringify(item));
  if (item['prefs']!=null) {
    prefs = item['prefs'] ;
    //console.log("Initial prefs " + JSON.stringify(prefs));
    //console.log("First " + domainExclude);
    if (domainExclude != undefined) {
      console.log("domainExclude in not blank is " + domainExclude);
      prefs['domain'] = domainExclude;
      browser.storage.local.set({'prefs': prefs}).then(null,onCompletion );
    }
    console.log("Prefs are " + JSON.stringify(prefs));
  }
  else {
    // Set up defaults if prefs absent
    //console.log("domainExclude otherwise is " + domainExclude);
    prefs['domain'] = domainExclude ;
    browser.storage.local.set({'prefs': prefs}, onCompletion );
  }
  //console.log("Domain Exclude: " + prefs['domain'])
  //console.log("domainExclude 3 " + domainExclude + " " +  versionHeader);
  domainExclude = prefs['domain']

  console.log("Prefs found " + domainExclude + " " + versionHeader);
// Listen for about-to-be-sent messsage
  async function listenforsend(tabid, details) { //15

    //console.log("Details: "+JSON.stringify(details))

// Check recipients of a message
    // console.log("To: "+ details['to'] )
    // console.log("CC: "+  details['cc'] )
    // console.log("BCC: "+  details['bcc'] )
    ExpandButton(tabid);// To expand addresses
// Build an array of To and CC recipients and remove exact duplicates
    if (domainExclude == undefined) {domainExclude = ""}
    if (versionHeader == undefined) {versionHeader = ""}
    console.log("Domain to exclude is:" + typeof domainExclude + ", " + domainExclude);
    if (versionHeader != "") {
        console.log("Version setting is " + typeof versionHeader + " is " + versionHeader);
    }
    var accounts = await browser.accounts.list();
    for (const account of accounts) {
     for (const identity of account.identities) {
       if (identity.id == details['identityId']) {
         Sender = identity.email;
       }
      }
    }
    console.log("Sender is " + Sender);
    if (Sender.indexOf(domainExclude) > 0 && versionHeader !="") {
      await browser.myapi.SetVersionHeader(versionHeader)
    }
    console.log(details);
    var reciplist = details['to'].concat(details['cc'])
    reciplist = reciplist.concat(details['bcc'])
    console.log("Recipient list :" + reciplist);
    var nonweeded = [];
    reciplist.forEach(element => {
      var dup = false;
      for (let i = 0; i < nonweeded.length; i++) {
        if (element == nonweeded[i]) {
          dup = true;
          break;
        };
      };
      if ( !dup ) { nonweeded.push(element) };
    });
    // console.log( "Weeded: " + nonbccweeded );

// Separate email addresses and lists (or posssible lists)

// This regex defines any string with one @ followed by a string containing 1 or more dots and no spaces as an email address
// Anything else might be a list
// TODO Check how TB defines an email address
    var re = /[^@]*@[^@\. ]*\.[^@ ]*$/;

    var validaddresses = [];
    var possiblelists = [];

    nonweeded.forEach(element => {
      var isaddress = re.test(element) ;
      if (isaddress) {
        validaddresses.push(element);
      } else {
        possiblelists.push(element);
      }
    });

     //console.log("Valid email addresses: " + validaddresses);
     //console.log("Possible lists: " + possiblelists);

// Match possible lists with mailing lists and count their contacts
    var contactcount;
    let listcontactspromise = new Promise((resolve) => { //8
      var listcontactsarray = [];
      if ( possiblelists.length == 0) { //7.5
        resolve(listcontactsarray);
      } else {
        browser.addressBooks.list(true)
        .then(function(books) {  //7
          contactcount = 0 ;
          books.forEach(book => {  //6
            if (book.mailingLists) {  //5
              // console.log("Mailing list node: " + JSON.stringify(book));
              book.mailingLists.forEach(list => {  //4
                // console.log("Mailing list name: " + list.name);
// Check each possible list for match on name
                possiblelists.forEach(posslist => { //3
// List recipients are of the form "name <name>" - extract the name
                  var possname = posslist.replace(/ <.*>$/,"");
//                  // console.log("Possible list name: " + possname );
//                  // console.log("This list name:  " + list.name);
//                  // console.log("This list contacts:  " + JSON.stringify(list.contacts) );

                  if (possname == list.name) {  //2
// Matches a list
                    // console.log("Matched list: " + possname + " Contacts: " + list.contacts.length);
                    // confirmedlists.push(possname);

// Collect the contacts from the list for later weeding of duplicates
//                    // console.log("Mailing list node: " + JSON.stringify(list));
                    list.contacts.forEach(contact => { //1
                      if (contact.properties.DisplayName == contact.properties.PrimaryEmail) {
                          listcontactsarray.push(contact.properties.PrimaryEmail);
                      } else {
                          listcontactsarray.push(contact.properties.DisplayName + "<" + contact.properties.PrimaryEmail + ">");
                      }
                      // console.log("Added contact: " + contact.properties.PrimaryEmail );
                    }) //1
                  }; //2
                }); //3
              }); //4
            }; //5
            resolve(listcontactsarray);
          }); //6
        }); //7
      }; //7.5
    }); //8

// Wait for all that
    let listcontacts  = await listcontactspromise ;

// Weed out duplicates within the list contacts.
// Note: Could count all the contacts in one go.
// But might report counts separately in future.
    var dup
    console.log("List contacts: " + listcontacts );
    var listcontactsweeded = [] ;
    listcontacts.forEach(element => {
      dup = false;
// Check within listcontacts
      for (let i = 0; i < listcontactsweeded.length; i++) {
        if (element == listcontactsweeded[i]) {
          dup = true;
          break;
        };
      };
// Check within validaddresses - just email address part so remove name
      for (let i = 0; i < validaddresses.length; i++) {
        var emailpart = validaddresses[i].replace(/^.*</, "") ;
        emailpart = emailpart.replace(/>.*$/, "") ;
         //console.log("Email part: " + emailpart ) ;
        if (element == emailpart) {
          dup = true;
          break;
        };
      };
      if ( !dup ) { listcontactsweeded.push(element) };
    });
    //console.log( "Weeded list contacts: " + listcontactsweeded );
    var Breakdomain = "";
    var controlledRecipients = [];// List of all addresses in the safe area
    var Recipients = [];// List of all the other addresses
 // Check the email addresses for validaddresses
   //Title[row] = Titles.slice(0,Titles.indexOf("|"));
    var TotalAddresses = validaddresses.concat(listcontactsweeded);
    for (let i = 0;i < TotalAddresses.length;i++) {
      var AddressDomain = TotalAddresses[i].slice(TotalAddresses[i].indexOf("@") + 1);
      if (AddressDomain.indexOf(">") > -1) {
        AddressDomain = AddressDomain.slice(0,AddressDomain.indexOf(">"));
      }
      console.log(TotalAddresses[i] + " " + domainExclude.indexOf(" ") + " " + domainExclude.indexOf(AddressDomain));
      console.log("Domain of " + TotalAddresses[i] + " is: " + AddressDomain + ", Domain to contain is:" + domainExclude);//gmail.com>
       if ((domainExclude[1] == "@" && "@" + AddressDomain == domainExclude) ||
          (domainExclude.indexOf(" ") > -1 && domainExclude.indexOf(AddressDomain) > -1)||
          (TotalAddresses[i].indexOf(domainExclude) > -1))
        {
         controlledRecipients.push(TotalAddresses[i]);
       }  else {
         Recipients.push(TotalAddresses[i]);
       }
    }
  // Check if any addresses break the barrier
  SenderDomain = Sender.slice(Sender.indexOf("@") + 1)
  if (SenderDomain.indexOf(">") > -1) {
    SenderDomain = SenderDomain.slice(0,SenderDomain.indexOf(">"));
  }
  console.log("Sender, Domain and place in DomainExclude:" + Sender + " " + SenderDomain + " " + domainExclude.indexOf(SenderDomain));
    if ((domainExclude[1] == "@" && "@" + SenderDomain == domainExclude) ||
       (domainExclude.indexOf(" ") > -1 && domainExclude.indexOf(SenderDomain) > -1)||
       (Sender.indexOf(domainExclude) > -1)) {
        if (Recipients.length > 0) {
          Breakdomain = Recipients;
        }
    } else {
        if (controlledRecipients.length > 0)  {
          Breakdomain = controlledRecipients;
        }
    }
console.log("controlledRecipients : " + controlledRecipients);
console.log("Recipients :" + Recipients);
console.log("Breakdomain " + Breakdomain);
if (Breakdomain.length > 0) {
// Breaks the domain barrier exceeded. Open a dialogue popup
//*
      extensionName = browser.i18n.getMessage("title");
      var createData={allowScriptsToClose: true,
      titlePreface : extensionName,
      width : 500,
      height : 300 + Breakdomain.length * 10,
      type : "popup",
      url : "dialogue.html?" + Breakdomain
      };

      var wid=null;
      browser.windows.create(createData).then((win)=>{
        wid=win.id;
      });

// Wait for response from popup
      let response = new Promise((resolve) => {
          async function gotmessage(msg) {
            // console.log(msg);
            browser.windows.remove(wid);
            browser.runtime.onMessage.removeListener(gotmessage);
            resolve(msg);
          }

          browser.runtime.onMessage.addListener(gotmessage);

      });
      var msgobj = await response ;
      console.log("Response of the window is:" + msgobj);
      // console.log("Response: "+mess) ;
// Action according to response

      var returnobj = new Object()
      returnobj['details'] = DetailsToSend ;
      if (msgobj.msg == "send_cancel") {
          returnobj['cancel'] = true;
      } else {
        returnobj['cancel'] = false;
      }
      //console.log( returnobj);
      return returnobj ;

    } else {
// No Breakdomain  - continue with send
      var returnobj = new Object();
      returnobj['details'] = DetailsToSend ;
//TESTING - Change to true to stop sending
      returnobj['cancel'] = false ;
      return returnobj ;
    }
  }; //15

// Register the onBeforeSend listener
  browser.compose.onBeforeSend.addListener(listenforsend) ;
  browser.composeAction.setTitle({title: ToolbarTitle});
  browser.composeAction.setIcon({path:"icons/icon_toolbar.png" });
  browser.composeAction.onClicked.addListener(ExpandButton);
}
// Error getting prefs
function onError(error) {
  console.log("domainExclude: "+ error)
}

function onCompletion() {                /* log error is there is one */
  if (chrome.runtime.lastError) {
    console.error("Domain to exclude: "+ chrome.runtime.lastError);
  }
}
function ExpandButton(item) {
  NewTo = [];
  NewCC = [];
  NewBCC = [];
  TabID = item.id;
  //console.log("TabID from click is " + TabID);
  GetDetails().then(YesGood,null);
}
async function GetDetails () {
  return browser.compose.getComposeDetails(TabID)
}

async function YesGood (item) {
  //console.log("output from details are " + JSON.stringify(item));
  console.log("Details of email" + JSON.stringify(item));
  var AddressesTo = item.to;
  var DetailsRetrieved = item;
  //console.log(DetailsRetrieved);
  var AddressesCC = item.cc;
  var AddressesBCC = item.bcc
  var PossibleLists = [];
  console.log("addresses to are " + AddressesTo + AddressesTo.length);
if (AddressesTo.length > 0) {
  NewTo = await FillAddresses(AddressesTo);
}
if (AddressesCC.length > 0) {
  NewCC = await FillAddresses(AddressesCC);
}
if (AddressesBCC.length > 0) {
  NewBCC = await FillAddresses(AddressesBCC)
}
console.log(NewTo + NewCC + NewBCC);
  //DetailsToSend = DetailsRetrieved;
  DetailsToSend.to = NewTo;
  DetailsToSend.cc = NewCC;
  DetailsToSend.bcc = NewBCC;
console.log("output from details are " + JSON.stringify(DetailsToSend));
console.log("NewTo is " + NewTo);
/*  DetailsToSend.replyTo = DetailsRetrieved.replyTo;
  DetailsToSend.followup = DetailsRetrieved.followup;
  DetailsToSend.newsgroups = DetailsRetrieved.newsgroups;
  DetailsToSend.subject = DetailsRetrieved.subject;
  */
//  console.log(TabID + " " + JSON.stringify(DetailsToSend));
  browser.compose.setComposeDetails(TabID,DetailsToSend);
}

  async function FillAddresses(OldAddressArray) {
    var NewAddressArray = []
  for (var k = 0; k < OldAddressArray.length; k++) {
    if (OldAddressArray[k].indexOf('@') == -1) {
      //console.log("Potential List " + AddressArray[k]);
      let listcontactspromise = new Promise((resolve) => { //8
      var listcontactsarray = [];
      if (OldAddressArray[k].length == 0) { //7.5
        resolve(listcontactsarray);
      } else {
        browser.addressBooks.list(true)
        .then(function(books) {  //7
          var contactcount = 0 ;
          books.forEach(book => {  //6
            if (book.mailingLists) {  //5
              // console.log("Mailing list node: " + JSON.stringify(book));
              book.mailingLists.forEach(list => {  //4
                // console.log("Mailing list name: " + list.name);
  // Check each possible list for match on name
                //PossibleLists.forEach(posslist => { //3
  // List recipients are of the form "name <name>" - extract the name
                  var possname = OldAddressArray[k].replace(/ <.*>$/,"");
  //                  // console.log("Possible list name: " + possname );
  //                  // console.log("This list name:  " + list.name);
  //                  // console.log("This list contacts:  " + JSON.stringify(list.contacts) );

                  if (possname == list.name) {  //2
  // Matches a list
                    // console.log("Matched list: " + possname + " Contacts: " + list.contacts.length);
                    // confirmedlists.push(possname);

  // Collect the contacts from the list for later weeding of duplicates
  //                    // console.log("Mailing list node: " + JSON.stringify(list));
                    list.contacts.forEach(contact => { //1
                      if (contact.properties.DisplayName == contact.properties.PrimaryEmail) {
                          listcontactsarray.push(contact.properties.PrimaryEmail);
                      } else {
                          listcontactsarray.push(contact.properties.DisplayName + "<" + contact.properties.PrimaryEmail + ">");
                      }
                      // console.log("Added contact: " + contact.properties.PrimaryEmail );
                    }) //1
                  }; //2
                //}); //3
              }); //4
            }; //5
            resolve(listcontactsarray);
          }); //6
        }); //7
      }; //7.5
    }); //8

  // Wait for all that
    let listcontacts  = await listcontactspromise ;
    //console.log("List " + listcontacts);
    for (var i = 0; i < listcontacts.length; i++) {
      if (listcontacts[i].indexOf(",") != -1) {
        listcontacts[i] = '"' + listcontacts[i] + '"'// To deal with mishandling of commas in setComposeDetails
      }
      NewAddressArray.push(listcontacts[i]);
        }
    } else {
      if (OldAddressArray[k].indexOf(",")!= -1) {
        OldAddressArray[k] = '"' + OldAddressArray[k] + '"'// To deal with mishandling of commas in setComposeDetails
      }
      NewAddressArray.push(OldAddressArray[k]);
    }
  }
  console.log("Array Sent " + OldAddressArray);
  console.log("Expanded to " + NewAddressArray);
  return NewAddressArray;
}
