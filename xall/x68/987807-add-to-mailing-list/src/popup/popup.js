function authorToEmail(text){
  const regexMail = /<(.+)>/i;
  let matches = text.match(regexMail);
    if (matches == null){ // no name
      return text;
    } else { // email
      return matches[1];
    }
}


// click event
function addToMailingList(listId, email) {
  // chercher le contact
  // console.log(listId + ' fonction addToMailingList');
  browser.contacts.quickSearch(email)
  .then((arrayContacts) => {
    var waitForId;
    if (arrayContacts.length == 0){
      // creation d'un ContactNode
      waitForId = browser.mailingLists.get(listId)
      .then((node) => {
        // console.log('create');
        return browser.contacts.create(node.parentId, {"DisplayName" : email, "PrimaryEmail" : email})
      }).then((id) => {
        // console.log('new: ' + id);
        return id
      })
    } else {
      // on prend le premier (on s'en fout...)
      waitForId = Promise.resolve(arrayContacts[0].id);
    }
    return waitForId;
  })
  // ajouter le contact
  .then((contactId) => {
    // console.log('ajout : ' + contactId + ' -- list : ' + listId);
    browser.mailingLists.addMember(listId, contactId);
    window.close();
  })

}


var txtMakeChoice = browser.i18n.getMessage("extensionMessageDisplayActionChoice");
document.getElementById('choice').innerHTML = txtMakeChoice;

var email;

browser.tabs.query({
  active: true,
  currentWindow: true,
}).then(tabs => {
  let tabId = tabs[0].id;
  return browser.messageDisplay.getDisplayedMessage(tabId)
}).then((message) => {
  // console.log(message);
  email = authorToEmail(message.author);
}).then(() => {
  return browser.addressBooks.list(true)
}).then((listBooks) => {
  for (let aBook of listBooks){
    for (let aList of aBook.mailingLists){
      let li = document.createElement("li");
      li.textContent = aList.name;
      li.addEventListener("click", () => addToMailingList(aList.id, email));
      document.getElementById("mailingLists").appendChild(li);
    }
  }
});
