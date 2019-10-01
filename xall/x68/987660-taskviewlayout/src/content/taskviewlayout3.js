browser.menus.onClicked.addListener(function(info, tab) {
      var button = document.createElement('button');
      var Button = browser.tabs.executeScript({
         code: 'button'
      });      
      var buttonChild = document.activeElement.appendChild(button);
      var ButtonChild = browser.tabs.executeScript({
         code: 'buttonChild'
      }); 
      var Taskview3 = Button.setAttribute('id', 'taskview3'); 
      var taskView3 = browser.tabs.executeScript({
         code: 'Taskview3'
      });              
      if(info.menuItemId === taskView3) {
      var layoutDeck = document.getElementById('calendarDisplayDeck');
      var LayoutDeck = browser.tabs.executeScript({
         code: 'layoutDeck'
      });
      var layoutContent = document.getElementById('calendarContent');
      var LayoutContent = browser.tabs.executeScript({
         code: 'layoutContent'
      });
      var layoutContainer = document.getElementById('calendar-task-details-container');
      var LayoutContainer = browser.tabs.executeScript({
         code: 'layoutCotainer'
      });
      var flex = 'LayoutDeck{flex: 0 2 0 }';
      LayoutDeck.insertCSS = flex;
      var LayoutChild = LayoutContent.appendChild = LayoutContainer;
      var LayoutCHild = browser.tabs.executeScript({
         code: 'LayoutCHild'
      });
}
});


