browser.menus.onClicked.addListener(function(info, tab) {
      var button = document.createElement('button');
      var Button = browser.tabs.executeScript({
         code: 'button'
      });      
      var buttonChild = document.activeElement.appendChild(button);
      var ButtonChild = browser.tabs.executeScript({
         code: 'buttonChild'
      }); 
      var Taskview2 = Button.setAttribute('id', 'taskview2'); 
      var taskView2 = browser.tabs.executeScript({
         code: 'Taskview2'
      });              
      if(info.menuItemId === taskView2) {
      var layoutTBox = document.getElementById('calendar-task-box');
      var LayoutTBox = browser.tabs.executeScript({
          code: 'layoutTBox'
      });
      var layoutContainer = document.getElementById('calendar-task-details-container');
      var LayoutContainer = browser.tabs.executeScript({
          code: 'layoutContainer'
      });
      var layoutDeck = document.getElementById('calendarDisplayDeck');
      var LayoutDeck = browser.tabs.executeScript({
         code: 'layoutDeck'
      });
      var LayoutChild = LayoutTBox.appendChild = LayoutContainer; 
      var LayoutCHild = browser.tabs.executeScript({
         code: 'LayoutChild'
      });
      var flex = 'layoutDeck{flex: 1 }';
      LayoutDeck.insertCSS = flex;
}
});

