if(!org) var org={};
if(!org.janek) org.janek={};

org.janek.identitychooser_mailtohelper = function(popupId,
                                                  onPopupShowing,
                                                  popupOwner) {
  var self = this;
  self.popupId = popupId;
  self.onPopupShowing = onPopupShowing;
  self.popupOwner = popupOwner;

  var pub = {};

  pub.mailtoTarget = null;

  // We need to do workaround ThunderBrowse if it is installed.
  // TBrowse registers a "onmouseup" event listener in XUL which
  // receives an event even if it was canceled in a regular event listener.
  //
  // The problem is that TBrowse opens a default message composer when a
  // mailto:-link is clicked.
  //
  // So when we detect TBrowse we remove the onmouseup attribute on
  // "#messagepanebox" and call the ThunderBrowseHandler.clickEvent()
  // directly if the click is not targeting a mailto:-link
  pub.onMouseDown = function(event, src) {
    var isTBrowseInstalled =
      document.getElementById("messagepanebox").hasAttribute("thunderbrowse");

    if(isTBrowseInstalled)
      {
        var messagePane = document.getElementById("messagepane");

        if(messagePane.hasAttribute("onmouseup"))
          {
            messagePane.removeAttribute("onmouseup");
          }
      }
  }

  pub.onMouseUp = function(event, src) {
    var isTBrowseInstalled =
      document.getElementById("messagepanebox").hasAttribute("thunderbrowse");

    if(isTBrowseInstalled)
      {
        // Execute TBrowse's click event handler if the click did not target
        // a mailto:-link.
        if((event.button == 0 &&
            (event.target.localName == 'A' ||
             event.target.localName == 'a') &&
            event.target.href.search(/^mailto:/) == 0) == false)
          {
            return ThunderBrowseHandler.clickEvent(event);
          }
      }

    return true;
  }

  pub.mailtoHandler = function(event, src) {
    // We only work with left mouse button clicks
    if(event.button == 0 &&
       (event.target.localName == 'A' ||
        event.target.localName == 'a'))
      {
        if(event.target.href.search(/^mailto:/) == 0)
          {
            var identityPopup = document.getElementById(self.popupId);
            if(!identityPopup)
              {
                identityPopup  = document.createElement("menupopup");
                identityPopup.setAttribute("id", self.popupId);
              }

            pub.mailtoTarget = event.target.href;

            identityPopup.addEventListener('popupshowing',
                                           self.onPopupShowing,
                                           false);

            var messagePaneBox = document.getElementById(self.popupOwner);
            messagePaneBox.appendChild(identityPopup);
            identityPopup.openPopup(event.target,
                                    "after_start", 0, 0, false, false);

            event.preventDefault();
          }
      }
  }

  return pub;
};
