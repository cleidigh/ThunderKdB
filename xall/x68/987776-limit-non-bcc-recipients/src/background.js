// Intercepts send and checks number of To + CC recipients against prefs
// If limit exceeded consults user

// v2.1.0 Process nested mailing lists

extensionName = browser.i18n.getMessage("extensionName");

// Retrieve the stored prefs, or initialise them
// Same code here and in prefs.js
var prefs = new Object() ;
let gettingItem = browser.storage.local.get('prefs');
gettingItem.then(onGot, onError);

// Prefs got
function onGot(item) {

  if (item['prefs']!=null) {
    prefs = item['prefs'] ;
// Add any prefs added since version 1 & set them to default or special values
    prefsAdded = false ;

    if (typeof prefs['strictLimit'] == "undefined") {
      prefs['strictLimit'] = false ;
      prefsAdded = true ;
    }
    
    if (prefsAdded) {
    browser.storage.local.set({'prefs': prefs})
      .then( null, onError);    
    }
  }
  else {
// Set up defaults if prefs absent
    prefs['maxNonBCC'] = 10 ;
    prefs['strictLimit'] = false ; 

    browser.storage.local.set({'prefs': prefs})
      .then( null, onError);
  }
// console.log("Limit non-BCC recipients: limit: " + prefs['maxNonBCC'])

// Listen for about-to-be-sent messsage
  async function listenforsend(tabid, details) { //15

// console.log("Details: "+JSON.stringify(details))

// Check recipients of a message
// console.log("To: "+ details['to'] )
// console.log("CC: "+  details['cc'] )
// console.log("BCC: "+  details['bcc'] )

// Build an array of To and CC recipients and remove exact duplicates
    nonbccrecip = details['to'].concat(details['cc'])
    nonbccweeded = [];
    nonbccrecip.forEach(element => {
      dup = false;
      for (let i = 0; i < nonbccweeded.length; i++) {
        if (element == nonbccweeded[i]) {
          dup = true;
          break;
        };
      };
      if ( !dup ) { nonbccweeded.push(element) };
    });
// console.log( "Weeded: " + nonbccweeded );

// Separate email addresses and lists (or posssible lists)

    validaddresses = [];
    possiblelists = [];

    nonbccweeded.forEach(element => {

// A mailing list will be in the address-book format: xxxx <xxxx> where x is anything non-blank
// Treat anything else as an email address 
// None of this _validates_ an email address.
      var re1 = /^[^ ].* <.*>$/ ;
      if (!re1.test(element)) {
        validaddresses.push(element);
      } else {

// If it ends with <yyyy@yyyy> where y is not space or @ treat it as an email address
// Note that it could still be a mailing list; if so we won't expand and count it
// except for special case below
        var re2 = /<[^@ ][^@ ]*@[^@ ][^@ ]*>$/ ;
        isaddress = re2.test(element) ;
        if (isaddress) {
          validaddresses.push(element);
// If the address ends with yyyy@zzzz where y is as above and z is not space or @ or . 
// then treat it as a possible list as well. e.g friends@club
// If there is such a list then we will overcount by one, which is better than undercounting.
// A list with a period such as friends@sailing.club will not be expanded.
          var re3 = /<[^@ ][^@ ]*@[^@ \.][^@ \.]*>$/ ;
          if (re3.test(element)) {
            possiblelists.push(element);
          }
        } else {
          possiblelists.push(element);
        }
      }

    });

// console.log("Valid email addresses: " + validaddresses);
// console.log("Possible lists: " + possiblelists);

    addresscount = validaddresses.length ;

// Match possible lists with mailing lists and count their contacts

    let listcontactspromise = new Promise((resolve) => { //8
      listcontactsarray = [];
      if ( possiblelists.length == 0) { //7.5
        resolve(listcontactsarray);
      } else {

// This section executed when a list has been found

// This function find addresses and nested lists with possiblelists
        function processLists(possiblelists) {        //7.4
          listlistsarray = [];

          return new Promise(resolve => { //7.2

            browser.addressBooks.list(true)
            .then(function(books) {  //7
              books.forEach(book => {  //6
                if (book.mailingLists) {  //5
// console.log("Mailing list node: " + JSON.stringify(book));
                  book.mailingLists.forEach(list => {  //4
// console.log("Mailing list name: " + list.name);
// Check each possible list for match on name
                    possiblelists.forEach(posslist => { //3
// List recipients are of the form "name <name>" - extract the name
                      possname = posslist.replace(/ <.*>$/,"");
// console.log("Possible list name: " + possname );
// console.log("This list name:  " + list.name);
// console.log("This list contacts:  " + JSON.stringify(list.contacts) );
    
                      if (possname == list.name) {  //2
// Matches a list
// console.log("Matched list: " + possname + " Contacts: " + list.contacts.length);
    
// Collect the contacts from the list for later weeding of duplicates
// console.log("Mailing list node: " + JSON.stringify(list));
                        list.contacts.forEach(contact => { //1
  
// A contact may be a mailing list
// If it is in form yyy@yyy where y is not space or @ then treat it as an email address
                          primaryEmail = contact.properties.PrimaryEmail ;
                          var re4 = /[^@ ][^@ ]*@[^@ ][^@ ]*/ ;
                          isaddress = re4.test(primaryEmail) ;
                          if (isaddress) {
                            listcontactsarray.push(primaryEmail);
// console.log("Added contact: " + primaryEmail );
                          } else {
                            listlistsarray.push(primaryEmail);
// console.log("Added list-list " + primaryEmail );
                          }
  
                        }) //1
                      }; //2
                    }); //3
                  }); //4
                }; //5
              }); //6

// console.log("listlistsarray: " + listlistsarray );
// console.log("listcontactsarray: " + listcontactsarray );
              resolve(listlistsarray);

            }); //7
          }); //7.2
        }; //7.4

// async function to call  processLists and await result
        async function asyncCall() {
// Loop until processLists returns empty listlists = any nested lists expanded
          continueLoop = true ;
          while (continueLoop){   

// console.log('calling processLists');
            const listlists = await processLists(possiblelists) ;
// console.log("listlists 2: " + listlists);
// console.log("listcontactsarray 2: " + listcontactsarray );       
            if (listlists.length == 0) {
              continueLoop = false ;
            } else {
               possiblelists = listlists ;
            }
          }
// console.log("listcontactsarray 3: " + listcontactsarray ); 
          resolve(listcontactsarray);
        }

        asyncCall();

// End of list processing section
      }; //7.5   
    }); //8

// Wait for all that
    let listcontacts  = await listcontactspromise ;

// Weed out duplicates within the list contacts.
// Note: Could count all the contacts in one go.
// But might report counts separately in future.

// console.log("List contacts: " + listcontacts );
    listcontactsweeded = [] ;
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
        emailpart = validaddresses[i].replace(/^.*</, "") ;
        emailpart = emailpart.replace(/>.*$/, "") ;
// console.log("Email part: " + emailpart ) ;
        if (element == emailpart) {
          dup = true;
          break;
        };
      };
      if ( !dup ) { listcontactsweeded.push(element) };
    });
// console.log( "Weeded list contacts: " + listcontactsweeded );

// count the number of non-duplicates
    listcount = listcontactsweeded.length ;

// Check if non-BCC count exceeds pref
// console.log("Addresses: " + addresscount + "  Lists: " + listcount + "  Limit: " + prefs['maxNonBCC']) ;
    nonbcc =  addresscount + listcount ;
    if ( nonbcc > prefs['maxNonBCC']) {

// Non-BCC count exceeded. Open a dialogue popup
      if (prefs['strictLimit']) {SL = 1} else {SL = 0}
//console.log("dialogue.html?" + nonbcc + "&m" + prefs['maxNonBCC'] + "&s" + SL);

      createData={allowScriptsToClose: true,
      titlePreface: extensionName,      
      width : 600,
      height : 300,
      type : "popup",
      url : "dialogue.html?" + nonbcc + "&m" + prefs['maxNonBCC'] + "&s" + SL
      };

      var wid=null;
      browser.windows.create(createData).then((win)=>{
        wid=win.id;
      });

// Wait for response from popup
      let response = new Promise((resolve) => {
          async function gotmessage(msg, sender) {
// console.log("Message: "+JSON.stringify(msg));
// console.log("Sender: " +JSON.stringify(sender));
// Only resolve responses from the dialogue window which will have frameID zero
            if (sender.frameId == 0 ) {
              browser.windows.remove(wid);
              browser.runtime.onMessage.removeListener(gotmessage);
              resolve(msg);
            }
          }
// There is a second listener for pref changes
          browser.runtime.onMessage.addListener(gotmessage);

      });

      msgobj = await response ;
      mess = msgobj['msg']
// console.log("Response: "+mess) ;

// Action according to response

      var returnobj = new Object()
      returnobj['details'] = {} ;      

      if (mess == "bcc_cancel") {
      returnobj['cancel'] = true ;
      }

      if (mess == "bcc_ok_false") {
//TESTING - Change to true to stop sending
      returnobj['cancel'] = false ;
      }

      if (mess == "bcc_ok_true") {
// Move To and CC to BCC
   
      returnobj['details']['bcc'] = details['bcc'].concat(details['to'], details['cc'])
      returnobj['details']['to'] = []
      returnobj['details']['cc'] = []

// console.log("Returned compose object:" + JSON.stringify(returnobj))

//TESTING - Change to true to stop sending
      returnobj['cancel'] = false ;
      }

      return returnobj ;

    } else {
// Non-BCC count not exceeded - continue with send
      var returnobj = new Object();
//TESTING - Change to true to stop sending
      returnobj['cancel'] = false ;
      return returnobj ;
    }

  }; //15

// Register the onBeforeSend listener
  browser.compose.onBeforeSend.addListener(listenforsend) ;

// Listener for changed prefs - 2nd listener for messages
  function gotmessage2(msg, sender) {
// console.log("Message2: "+JSON.stringify(msg));
// console.log("Sender2: " +JSON.stringify(sender));
// Only resolve responses from the prefs window which will have frameID non-zero
    if (sender.frameId != 0 ) {
      if (msg.maxNonBCC !== "undefined"){
        prefs = msg ;
// console.log("Limit non-BCC recipients: limit changed to: " + prefs['maxNonBCC'])
      }
    }
  }

  browser.runtime.onMessage.addListener(gotmessage2);

}

// Error getting prefs
function onError(error) {
  console.log("Limit non-BCC recipients: "+ error)
}
