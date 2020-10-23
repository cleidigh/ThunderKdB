var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://sendtocategory/content/scripts/i18n.js");

var jbCatMan = window.opener.jbCatMan;
var dialogType = "";
var originalName = "";
var levels = [];

function initLocales(acceptLabel, cancelLabel) {
  let extension = jbCatMan.extension
  i18n.updateDocument({ extension });
  
  if (document.documentElement.getButton("accept") && acceptLabel) {
    document.documentElement.getButton("accept").label = extension.localeData.localizeMessage(acceptLabel);
  }
  
  if (document.documentElement.getButton("cancel") && cancelLabel) {
    document.documentElement.getButton("cancel").label = extension.localeData.localizeMessage(cancelLabel);
  }
}

function editCategoryLoad()
{
    initLocales();
    originalName = window.arguments[0];
    levels = originalName ? originalName.split(" / ") : [];

    document.title = window.arguments[1];
    dialogType = window.arguments[2];
    switch (dialogType) {
      case "add":
        document.getElementById("parentCategory").value = originalName ? originalName + " / " : "";
        document.getElementById("categoryName").value = "";
      break;
      case "rename":
        document.getElementById("parentCategory").value = levels.length > 1 ? levels.slice(0, -1).join(" / ") + " / " : "";
        document.getElementById("categoryName").value = levels[levels.length - 1];
      break;
    }
  
    document.addEventListener("dialogaccept", function(event) {
        let rv = doOK();
        if (!rv) event.preventDefault(); // Prevent the dialog closing.
    });
}

function doOK()
{
    let newName = document.getElementById("categoryName").value.trim();
    if (newName == "") {
      return false;
    }
    
    switch (dialogType) {
      case "add":
        levels.push(newName);
        newName = levels.join(" / ");

        if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
          for (let card of window.opener.GetSelectedAbCards()) {
            if (card.isMailList) {
              continue;
            }
            let catsArray = jbCatMan.getCategoriesfromCard(card);
            catsArray.push(newName);
            jbCatMan.setCategoriesforCard(card, catsArray);
            jbCatMan.modifyCard(card);            
          }
        } 
        else {
          alert(jbCatMan.locale.errorAdd.replace("##newname##", newName));
        }
        break;
      
      case "rename":
        levels[levels.length - 1] = newName;
        newName = levels.join(" / ");
        
        //It is not allowed to rename a category to a name which exists already
        if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
          // Manipulate selectedCategory.
          jbCatMan.data.selectedCategory = btoa("Category:" + newName).split("=").join("");
          // Go through all contacts and rename that category.
          jbCatMan.updateCategories("rename", originalName, newName);          
        } else {
            alert(jbCatMan.locale.errorRename.replace("##oldname##", originalName).replace("##newname##", newName));
        }
        break;
        
      default:
        alert("unknown command");
    }

    return true;
}
