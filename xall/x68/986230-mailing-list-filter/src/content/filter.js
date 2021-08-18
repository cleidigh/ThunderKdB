"use strict";

// replaces filterEditorOverlay.xul and bindings.xml

{
  const Ci = Components.interfaces;
  const Cc = Components.classes;

  console.log("filter.js - start...");

  function patchMailingListSelector(es) {
    function updateSearchValue(menulist) {
      let target = this.closest(".search-value-custom");
      if (target) {
        target.setAttribute("value", menulist.value);
        // The AssignMeaningfulName functions uses the item's js value, so set
        // this to allow this to be shown correctly.
        target.value = menulist.getAttribute('label');
      }
      else {
        console.log("cannot update search value for menulist:")
        console.log(menulist);
      }
    }

    function addDirectories(aDirEnum, aMenupopup) {
      let uris = Array()
      while (aDirEnum.hasMoreElements()) {
        let dir = aDirEnum.getNext();
        if (dir instanceof Ci.nsIAbDirectory)
        {
          // get children
          let newMenuItem = document.createXULElement('menuitem');
          let displayLabel = dir.dirName;
          if (dir.isMailList)
            displayLabel = "--" + displayLabel;
          newMenuItem.setAttribute('label', displayLabel);
          newMenuItem.setAttribute('value', dir.URI);
          aMenupopup.appendChild(newMenuItem);
          uris.push(dir.URI)
          // recursive add of child mailing lists
          let childNodes = dir.childNodes;
          if (childNodes && childNodes.hasMoreElements()) {
            let subUris = addDirectories(childNodes, aMenupopup);
            uris = uris.concat(subUris);
          }
        }
      }
      return uris;
    }

    console.log("patchMailingListSelector()");

    if (es.firstChild && es.firstChild.classList.contains("mlf-tag")) return true;
    if (es.firstChild) es.removeChild(es.firstChild);
    try {
      let wrapper = es.closest("search-value"),
        menulistFragment = window.MozXULElement.parseXULToFragment(`
        <menulist flex="1" class="search-value-menulist flexinput mlf-tag" inherits="disabled"
                  oncommand="this.parentNode.updateSearchValue(this);">
          <menupopup class="search-value-popup"></menupopup>
        </menulist>
      `);
      // dropdown selected, then we haven't got the container <hbox class="search-value-custom" />

      es.appendChild(menulistFragment);
      es.classList.add("flexelementcontainer");
      es.updateSearchValue = updateSearchValue;

      let value = es.getAttribute("value"),
        menulist = es.getElementsByTagName("menulist")[0],
        menuPopup = es.lastChild.getElementsByTagName("menupopup")[0];

      // set the default to the personal address book
      if (!value || !value.length)
        value = "jsaddrbook://abook.sqlite";

      // recursively add all address books and email lists
      let abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      let uris = addDirectories(abManager.directories, menuPopup);

      menulist.setAttribute('value', value);
      menulist.selectedIndex = uris.indexOf(value);

      es.setAttribute("value", value);
      es.value = value;
      es.updateSearchValue(menulist);
      es.setAttribute('mlf-patched', "true");
      return true;
    }
    catch(ex) {
      console.log(ex);
      return false;
    }

  }


  function callbackMailingListSearchCondition(mutationList, observer) {
    mutationList.forEach( (mutation) => {
      switch(mutation.type) {
        case 'childList':
          /* One or more children have been added to and/or removed
             from the tree.
             (See mutation.addedNodes and mutation.removedNodes.) */
          // iterate nodelist of added nodes
          let nList = mutation.addedNodes;
          nList.forEach( (el) => {
            if (!el.querySelectorAll) return; // leave the anonymous function, this continues with the next forEach
            let hbox = el.querySelectorAll("hbox.search-value-custom");
            hbox.forEach ( (es) => {
              let attType = es.getAttribute('searchAttribute'),
                isPatched = false;
              if (!attType.startsWith("mailing-list-filter@")) return;

              console.log("Mutation observer (childList), check for patching: " + es);

              switch(attType) {
                case "mailing-list-filter@peci1.cz#mailingList":  // fall-through
                case "mailing-list-filter@peci1.cz#mailingListRecipients":
                  isPatched = patchMailingListSelector(es)
                  break;
                default:
                // irrelevant
              }
              if (isPatched) {
                console.log("mutation observer patched: " + es);
              }

            });
          });
          break;
        case "attributes":
        {
          let es = mutation.target;
          if (es.classList.contains("search-value-custom")) {
            let attType = es.getAttribute('searchAttribute'),
              isPatched = false;
            console.log("attribute changed: " + attType);
            if (!attType.startsWith("mailing-list-filter@")) return;

            console.log("Mutation observer (attribute), check for patching: " + es);
            // console.log(es);

            switch(attType) {
              case "mailing-list-filter@peci1.cz#mailingList":  // fall-through
              case "mailing-list-filter@peci1.cz#mailingListRecipients":
                if (es.firstChild) {
                  if (es.firstChild.classList.contains("mlf-tag")) return;
                  es.removeChild(es.firstChild);
                }
                isPatched = patchMailingListSelector(es)
                break;
              default:
              // irrelevant
            }
            if (isPatched) {
              console.log("mutation observer patched: "  + es);
            }
          }
        }
          break;
      }
    });
  }


  // watch out for custom conditions being added to the top list.
  // or the searchAttribute changing to something that matches
  window.mlf_observer = new window.MutationObserver(callbackMailingListSearchCondition);

  const mlf_observerOptions = {
    childList: true,
    attributes: true,
    subtree: true // Omit (or set to false) to observe only changes to the parent node
  }

  let termList = window.document.querySelector('#searchTermList')
  window.mlf_observer.observe(termList, mlf_observerOptions);

  console.log("filter.js - Finished.");
}

function onLoad(activatedWhileWindowOpen) {
}

function onUnload(isAddOnShutown) {
  window.mlf_observer.disconnect();
}