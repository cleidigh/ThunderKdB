      var eunjo4 = function() {
      var layoutTBox = document.getElementById('calendar-task-box');
      var LayoutTBox = browser.tabs.executeScript( {
          code: layoutTBox
      });
      var layoutContainer = document.getElementById('calendar-task-details-container');
      var LayoutContainer = browser.tabs.executeScript({
         code: layoutContainer
      });
      var layoutDeck = document.getElementById('calendarDisplayDeck');
      var LayoutDeck = browser.tabs.executeScript({
         code: layoutDeck
      });
      LayoutTBox.appendChild = LayoutContainer;
      var flex = 'LayoutDeck{flex: 1 }';
      LayoutDeck.insertCSS = flex;}

      browser.tabs.onActivated.addListener(eunjo4);
