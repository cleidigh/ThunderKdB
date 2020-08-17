formOne.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('ltnSidebar', 'allowEvents', 'true');
          browser.myapi.setFive('minimonth-pane', 'allowEvents', 'true');
          browser.myapi.setTen('mini-day-box', 'width', '200');
          browser.myapi.setEleven('mini-day-box', 'height', '50');
          browser.myapi.setOne('ltnSidebar', 'insertBefore', 'cloneThree', 'todayPane');
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setTen('mini-day-box', 'width', '200');
          browser.myapi.setEleven('mini-day-box', 'height', '50');
          browser.myapi.setTwo('folderPaneBox', 'insertBefore', 'cloneFour', 'todayTree');
});

formTwo.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('ltnSidebar', 'allowEvents', 'true');
          browser.myapi.setFive('minimonth-pane', 'allowEvents', 'true');
          browser.myapi.setSix('ltnSidebar', 'removeChild', 'childOne');
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setSeven('folderPaneBox', 'removeChild', 'childTwo');
});

formThree.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('ltnSidebar', 'allowEvents', 'true');
          browser.myapi.setThree('ltnSidebar', 'appendChild', 'cloneOne');
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setFour('folderPaneBox', 'appendChild', 'cloneTwo');
});

formFour.addEventListener('click', function () {
          browser.myapi.setEight('ltnSidebar', 'removeChild', 'childThree');
          browser.myapi.setNine('folderPaneBox', 'removeChild', 'childFour');
});