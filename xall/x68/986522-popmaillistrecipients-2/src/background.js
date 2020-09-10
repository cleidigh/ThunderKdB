browser.composeAction.setTitle({title: "Expand Addresses"});
browser.composeAction.setIcon({path:"icons/icon_toolbar.png" });
browser.composeAction.onClicked.addListener(ExpandButton);
var TabID;
var NewTo = [];
var NewCC = [];
var NewBCC = [];
var DetailsToSend = {};

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
  var AddressesTo = item.to;
  var DetailsRetrieved = item;
  //console.log(DetailsRetrieved);
  var AddressesCC = item.cc;
  var AddressesBCC = item.bcc
  var PossibleLists = [];
  //console.log("addresses to are " + AddressesTo + AddressesTo.length);
if (AddressesTo.length > 0) {
  NewTo = await FillAddresses(AddressesTo);
}
if (AddressesCC.length > 0) {
  NewCC = await FillAddresses(AddressesCC);
}
if (AddressesBCC.length > 0) {
  NewBCC = await FillAddresses(AddressesBCC)
}
  //console.log(NewTo + NewCC + NewBCC);
  //DetailsToSend = DetailsRetrieved;
  DetailsToSend.to = NewTo;
  DetailsToSend.cc = NewCC;
  DetailsToSend.bcc = NewBCC;
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
                      console.log(JSON.stringify(contact.properties));
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
