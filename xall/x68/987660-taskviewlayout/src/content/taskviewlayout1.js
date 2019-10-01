browser.menus.onClicked.addListener(function() {
      var button = document.createElement('button');
      var Button = browser.tabs.executeScript({
         code: 'button'
      });      
      var buttonChild = document.activeElement.appendChild(button);
      var ButtonChild = browser.tabs.executeScript({
         code: 'buttonChild'
      }); 
      var Taskvie1 = Button.setAttribute('id', 'taskview2'); 
      var taskView1 = browser.tabs.executeScript({
         code: 'Taskview1'
      });              
      if(info.menuItemId === taskView1) {
      var layoutTBox = document.getElementById('calendar-task-box');
      var LayoutTBox = browser.tabs.executeScript({
          code: layoutTBox
      });
      var layoutContainer = document.getElementById('calendar-task-details-container');
      var LayoutContainer = browser.tabs.executeScript({
          code: layoutContainer
      });
      var layoutABox = document.getElementById('task-addition-box');
      var LayoutABox = browser.tabs.executeScript({
          code: layoutABox
      });
      var layoutDeck = document.getElementById('calendarDisplayDeck');
      var LayoutDeck = browser.tabs.executeScript({
         code: layoutDeck
      });
      var LayoutBefore = LayoutABox.before = LayoutContainer;
      var LayoutBEfore = browser.tabs.executeScript({
         code: 'LayoutBefore'
      });
      var flex = 'LayoutDeck{flex: 1 }';
      LayoutDeck.insertCSS = flex;
}
});
