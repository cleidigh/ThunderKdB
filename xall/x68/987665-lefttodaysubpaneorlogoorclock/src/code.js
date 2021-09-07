formOne.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('calSidebar', 'allowEvents', 'true');
          browser.myapi.setFive('minimonth-pane', 'allowEvents', 'true');
          browser.myapi.setTen('mini-day-box', 'width', '200');
          browser.myapi.setEleven('mini-day-box', 'height', '50');
          browser.myapi.setOne('calSidebar', 'insertBefore', 'cloneThree', 'todayPane');
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setTen('mini-day-box', 'width', '200');
          browser.myapi.setEleven('mini-day-box', 'height', '50');
          browser.myapi.setTwo('folderPaneBox', 'insertBefore', 'cloneFour', 'todayTree');
});

formTwo.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('calSidebar', 'allowEvents', 'true');
          browser.myapi.setFive('minimonth-pane', 'allowEvents', 'true');
          browser.myapi.setSix();
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setSeven();
});

formThree.addEventListener('click', function () {
          browser.myapi.setFive('calendarContent', 'allowEvents', 'true');
          browser.myapi.setFive('calSidebar', 'allowEvents', 'true');
          browser.myapi.setThree('calSidebar', 'appendChild', 'cloneOne');
          browser.myapi.setFive('messengerBox', 'allowEvents', 'true');
          browser.myapi.setFive('folderPaneBox', 'allowEvents', 'true');
          browser.myapi.setFour('folderPaneBox', 'appendChild', 'time');
});

formFour.addEventListener('click', function () {
          browser.myapi.setEight();
          browser.myapi.setNine();
});


formFive.addEventListener('click', function () {
         browser.myapi.setTwelve('folderPaneBox', 'appendChild', 'imageTb4');
async function execute(theme) { 

var theme = await browser.theme.getCurrent();

var getCurrentBackgroundColorSixteen = theme.colors.sidebar;

browser.myapi.setSixteen("folderPaneBox", "backgroundColor", getCurrentBackgroundColorSixteen);
};
execute();
browser.theme.onUpdated.addListener(execute);
});

formSix.addEventListener('click', function () {
          browser.myapi.setThirteen();
});

formSeven.addEventListener('click', function () {
          browser.myapi.setFourteen('calSidebar', 'appendChild', 'imageTb4');
});

formEight.addEventListener('click', function () {
          browser.myapi.setFifteen();
});