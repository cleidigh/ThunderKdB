function executeMessage(execute) {
          async function doAsSidebarColor(theme) {
              var theme = await browser.theme.getCurrent();
                  if (theme.colors.sidebar == "white") {
                          browser.myapi.setSixteen('folderPaneBox', 'backgroundColor', 'white') } 
                      else if (theme.colors.sidebar == "#fff") { 
                          browser.myapi.setSeventeen('folderPaneBox', 'backgroundColor', '#fff') }
                      else if (theme.colors.sidebar == "#38383D") {
                          browser.myapi.setEighteen('folderPaneBox', 'backgroundColor', '#38383D') } 
                      else if (theme.colors.sidebar == "#303030") { 
                          browser.myapi.setNineteen('folderPaneBox', 'backgroundColor', '#303030') }
                      else if (theme.colors.sidebar == "black") { 
                          browser.myapi.setTwenty('folderPaneBox', 'backgroundColor', 'black') }
                      else if (theme.colors == null) { 
                          browser.myapi.setEighteen('folderPaneBox', 'backgroundColor', '#38383D') }
          };
          doAsSidebarColor();
}
browser.theme.onUpdated.addListener(executeMessage);
browser.runtime.onMessage.addListener(executeMessage); 