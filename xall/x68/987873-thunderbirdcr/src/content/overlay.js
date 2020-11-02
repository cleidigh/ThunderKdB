var toolbarButtonId = "thunderbirdcr_okb99_com-browserAction-toolbarbutton";

window.addEventListener('load', function() {
  document.getElementById(toolbarButtonId).onclick = function() {
    let sidebar = document.getElementById("thunderbirdcrPane");
    if (sidebar.getAttribute("collapsed") === true || sidebar.getAttribute("collapsed") === "true") {
      sidebar.setAttribute("collapsed", false);
    } else {
      sidebar.setAttribute("collapsed", true);
    }
  }
});

var getSelectedText = function() {
  let searchText = window.getSelection().toString().trim();
  let messagepane = document.getElementById("messagepane");
  if (searchText === "" && messagepane && messagepane.contentWindow) {
    searchText = messagepane.contentWindow.getSelection().toString().trim();
  }
  return searchText;
}

var quickSearch = function() {
  let sidebar = document.getElementById("thunderbirdcrPane");
  let searchText = getSelectedText();
  if (searchText !== "") {
    if (sidebar.getAttribute("collapsed") === true || sidebar.getAttribute("collapsed") === "true") {
      sidebar.setAttribute("collapsed", false);
    }
    let sidebarWindow = sidebar.getElementsByTagName("browser")[0].contentWindow
    let data = JSON.stringify({ searchText: searchText });
    console.log("quickSearch: " + searchText);
    sidebarWindow.postMessage(data, "*");
  }
}

var toggleMenuItem = function() {
  let menuItem = document.getElementById('thunderbirdcr-menu-item');
  let searchText = getSelectedText();
  if (searchText !== "") {
    menuItem.style.display = "inline";
    menuItem.setAttribute("label", `${"search_label".toLocaleString()}:  "${searchText}"`);
  } else {
    menuItem.style.display = "none";
  }
}
