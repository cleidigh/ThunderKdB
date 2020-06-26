// Listen for button click and expand all mailing lists

// console.log ("Expand mailing lists addon active");

function buttonlistener(args) { //15
  // console.log("Clicked. args: " + JSON.stringify(args) ) ;
  tabid = args.id

// Build an array of mailing lists (MailingListNode objects) from the address book

  let listarray = new Promise((resolve) => { //8  
    let listarray = [];
    browser.addressBooks.list(true)
    .then(function(books) {  //7
      // console.log("Address books: " + JSON.stringify(books));
      books.forEach(book => {  //6
        if (book.mailingLists) {  //5
          book.mailingLists.forEach(list => {  //4
          // console.log("Mailing list name: " + list.name);
// Add the mailing list node to listarray
            listarray.push(list)
            // console.log("Mailing list node: " + JSON.stringify(list));
          }); //4
        }; //5
      }); //6   
    resolve(listarray);
    }); //7
  }); //8

  listarray.then(function (listarray) {  //10
    // console.log("listarray: " + listarray);
    // console.log("listarray[0]: " + JSON.stringify(listarray[0]) );    

// This regex defines any string with one @ followed by a string containing 1 or more dots and no spaces as an email address
// Anything else might be a list
    var re = /[^@]*@[^@\. ]*\.[^@ ]*$/;

// For an array of ComposeRecipient replace mailing lists with contacts 
    function convertrecipientarray(recipientarray) { //9
      expandedarray1 = [];      
      listsfound = [];
      recipientarray.forEach(recipient => {  //8
// Is this recipient an address - if not it may be a list (or an invalid address)            
        isaddress = re.test(recipient) ;   
        if (isaddress) {  //7
// Valid address - add to ouput
          expandedarray1.push(recipient) ;
        } else {  
// Possible list - check for duplicate lists so we only expand each one once
          dup = false;      
          for (let i = 0; i < listsfound.length; i++) {  
            if (recipient == listsfound[i]) {
              dup = true;
              break;
            };
          };
          if (!dup) { listsfound.push(recipient) }; //no indent
// Look for list in the listarray
          for (let i = 0; i < listarray.length; i++) { //6
// List recipients are of the form "name <name>" - extract the name
            possname = recipient.replace(/ <.*>$/,"");
            if (possname == listarray[i].name ) { //5
              // console.log("Matched list: " + possname + " Number of contacts: " + listarray[i].contacts.length);
              listarray[i].contacts.forEach(contactobj => {  //4
                expandedarray1.push(contactobj.properties.PrimaryEmail);
              }); //4
            }; //5          
          }; //6
        };  //7
      }); //8   
      // console.log("Expanded before weeding: " + expandedarray1);
   
  // Weed out exact duplicates from expanded array    
      expandedarray2 = [];
      expandedarray1.forEach(element => {
        dup = false;        
        for (let i = 0; i < expandedarray2.length; i++) {  
          if (element == expandedarray2[i]) {
            dup = true;
            break;
          };
        };
        if ( !dup ) { expandedarray2.push(element); };        
       }); 

    // console.log( "Weeded: " +  expandedarray2);
    return expandedarray2;
    }; //9

// Expand the three recipient arrays (To, CC, BCC)
    browser.compose.getComposeDetails(tabid)
    .then(details => {
      // console.log("Compose details: "+JSON.stringify(details));
      expandedto = [];
      expandedcc = [];
      expandedbcc = [];
  
      if (details.to.length != 0) {
        // console.log("Recipients To: "+JSON.stringify(details.to)) ;
        expandedto = convertrecipientarray(details.to);
        // console.log("Expanded recips To: "+JSON.stringify(expandedto)) ; 
      }
      if (details.cc.length != 0) {    
        // console.log("Recipients CC: "+JSON.stringify(details.cc)) ;
        expandedcc = convertrecipientarray(details.cc);
        // console.log("Expanded recips CC: "+JSON.stringify(expandedcc)) ; 
      }
      if (details.bcc.length != 0) {    
        // console.log("Recipients BCC: "+JSON.stringify(details.bcc)) ;
        expandedbcc = convertrecipientarray(details.bcc);
        // console.log("Expanded recips BCC: "+JSON.stringify(expandedbcc)) ; 
      }  
  
// Set the compose details to include the new recipients
      browser.compose.setComposeDetails(tabid,  { to: expandedto, cc: expandedcc, bcc: expandedbcc} )
  
    });

  }); //10

}; //15

browser.composeAction.onClicked.addListener(buttonlistener);