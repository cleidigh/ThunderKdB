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
          browser.myapi.setSix();
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setSeven();
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
          browser.myapi.setEight();
          browser.myapi.setNine();
});


formFive.addEventListener('click', function () {
         browser.runtime.sendMessage({execute: "do it as sidebar color"});
         browser.myapi.setTwelve('folderPaneBox', 'appendChild', 'imageTb4');
});

formSix.addEventListener('click', function () {
          browser.myapi.setThirteen();
});

formSeven.addEventListener('click', function () {
          browser.myapi.setFourteen('ltnSidebar', 'appendChild', 'imageTb4');
});

formEight.addEventListener('click', function () {
          browser.myapi.setFifteen();
});