/* Inside WindowListener */
// NotifyTools
//  https://github.com/thundernest/addon-developer-support/wiki/Tutorial:-Convert-add-on-parts-individually-by-using-a-messaging-system
//  https://github.com/thundernest/addon-developer-support/tree/master/scripts/notifyTools
//  https://github.com/thundernest/addon-developer-support/tree/master/auxiliary-apis/NotifyTools

//call with
//    await messenger.runtime.sendMessage('cardbook@vigneau.philippe', options);
//  options:
//    {query: 'version'}                return version info
//      {version: api-version, exclusive: true|false}
//    {query: 'lists'}                  return array of all lists
//      [{name: fn, id: id, bcolor: backgroundcolor, fcolor: foregroundcolor}, ...]
//    {query: 'lists', id: id}          return array of emails for list with id
//      [{fn: fn, email: email}, ...]  (fn only if exists)
//    {query: 'contacts', search: searchterm}   return array of contacts which matches searchterm
//      [complete card from cardbook, ...]    (should probably reduced to essential data)
//    {query: 'openBook'}               open cardbook window, returns nothing

//Update if api changes!
const API_VERSION=1;

notifyTools.enable();

let id = notifyTools.registerListener((message)=>{
  switch (message.query) {
    case 'version':
      let exclusive=cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
      return {version: API_VERSION, exclusive: exclusive};
      break;
    case 'lists':
      return lists(message.id);  //all lists if exists, else emails of list with id
      break;
    case 'contacts':
      return contacts(message.search);
      break;
    case 'openBook':
      let m3p = Services.wm.getMostRecentWindow("mail:3pane");
      if (m3p) {
        let tabmail = m3p.document.getElementById("tabmail");
        if (tabmail) {
          //m3p.focus();
          tabmail.openTab('cardbook', {title: cardbookRepository.extension.localeData.localizeMessage("cardbookTitle")});
        }
      }
      break;
  }
});

function lists(id) {
  if (id) {
    let emails=[];
    let list = cardbookRepository.cardbookCards[id];
    if (!list) return emails;
    let members = cardbookRepository.cardbookUtils.getMembersFromCard(list);
    for (let email of members.mails) {	//pure emails
      emails.push({email: email});
    }
    for (let card of members.uids) {
      if (card.fn)
        emails.push({fn: card.fn, email: card.emails[0]});
      else
        emails.push({email: card.emails[0]});
    }
    return emails;
  } else {
    let lists=[];
    for (let j in cardbookRepository.cardbookCards) {
      //j=dirPrefId::uid
      let card = cardbookRepository.cardbookCards[j];
      if (card.isAList) {
        let bcolor=cardbookRepository.cardbookNodeColors[card.categories[0]]
             ??cardbookRepository.cardbookPreferences.getColor(card.dirPrefId);
        let fcolor=cardbookRepository.getTextColorFromBackgroundColor(bcolor);
        lists.push({name: card.fn, id: card.dirPrefId+'::'+card.uid, bcolor: bcolor, fcolor: fcolor});
      }
    }
    return lists;
  }
}
function contacts(search) {
  let contacts=new Array();
  let searchString = cardbookRepository.makeSearchString(search);
  let searchArray = cardbookRepository.autocompleteRestrictSearch
          ? cardbookRepository.cardbookCardShortSearch
          : cardbookRepository.cardbookCardLongSearch;
  if (Object.keys(searchArray).length==0) return contacts;
  search=search.toUpperCase();
  for (let account of cardbookRepository.cardbookAccounts) {
    if (account[1] && account[5] && account[6] != "SEARCH") {
      let dirPrefId = account[4];
      for (let j in searchArray[dirPrefId]) {
        if (j.indexOf(searchString) >= 0 || searchString == "") {
          for (let card of searchArray[dirPrefId][j]) {
            let bcolor=cardbookRepository.cardbookNodeColors[card.categories[0]]
                ??cardbookRepository.cardbookPreferences.getColor(card.dirPrefId);
            let fcolor=cardbookRepository.getTextColorFromBackgroundColor(bcolor);
            card.bcolor=bcolor;
            card.fcolor=fcolor;
            contacts.push(card);
          }
        }
      }
    }
  }
  return contacts;
}