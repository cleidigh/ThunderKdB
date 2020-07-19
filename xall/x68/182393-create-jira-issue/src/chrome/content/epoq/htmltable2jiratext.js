var EXPORTED_SYMBOLS = ["htmltable2jiratext", "htmlrow2jiratext", "htmlremovetable"];

Components.utils.import('resource://gre/modules/Services.jsm');

function htmltable2jiratext(trows) {
  var jiratext = "";
    for (var i = 0; i < trows.length; i++) {
        var HTMLCollectionArray = [];
        HTMLCollectionArray = HTMLCollectionArray.concat(Array.prototype.slice.call(trows[i].getElementsByTagName("th")));
        HTMLCollectionArray = HTMLCollectionArray.concat(Array.prototype.slice.call(trows[i].getElementsByTagName("td")));
        var tddata = HTMLCollectionArray;
        if (tddata.length != 0) {
          jiratext += "||"
          for (var j = 0; j < tddata.length; j++) {
            jiratext += tddata[j].innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/\s\s+/g, ' ').trim();
            if (tddata[j].innerText.trim() != "") {
              jiratext += "|";
            } else {
              jiratext += " |";
            };
          };
          jiratext += "\n"
        };
      };
    return jiratext;
}

function htmlrow2jiratext(tddata) {
  var jiratext = "";
  if (tddata.length != 0) {
    jiratext += "||"
    for (var j = 0; j < tddata.length; j++) {
      jiratext += tddata[j].innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/\s\s+/g, ' ').trim();
      if (tddata[j].innerText.trim() != "") {
        jiratext += "|";
      } else {
        jiratext += " |";
      };
    };
    jiratext += "\n"
  };
  return jiratext;
}

function htmlremovetable(doc) {
  for (var i = 0; i < doc.getElementsByTagName('tr').length; i++) {
    doc.getElementsByTagName('tr')[i].innerHTML = "";
  };
  Array.prototype.slice.call(doc.getElementsByTagName('tr')).forEach(
  function(item) {
    item.remove();
  });
  for (var i = 0; i < doc.getElementsByTagName('th').length; i++) {
    doc.getElementsByTagName('th')[i].innerHTML = "";
  };
  Array.prototype.slice.call(doc.getElementsByTagName('th')).forEach(
  function(item) {
    item.remove();
  });
  for (var i = 0; i < doc.getElementsByTagName('td').length; i++) {
    doc.getElementsByTagName('td')[i].innerHTML = "";
  };
  Array.prototype.slice.call(doc.getElementsByTagName('td')).forEach(
  function(item) {
    item.remove();
  });
  var COMMENT_PSEUDO_COMMENT_OR_LT_BANG = new RegExp(
    '<!--[\\s\\S]*?(?:-->)?'
    + '<!---+>?'  // A comment with no body
    + '|<!(?![dD][oO][cC][tT][yY][pP][eE]|\\[CDATA\\[)[^>]*>?'
    + '|<[?][^>]*>?',  // A pseudo-comment
    'g');
  doc.documentElement.innerHTML = doc.documentElement.innerHTML.replace(/<br\s*\\?>/g, " \r\n<br />")
  var tmp = doc.documentElement.textContent.replace(COMMENT_PSEUDO_COMMENT_OR_LT_BANG, "").replace(/[^\S\r\n\t]+/g, ' ').replace(/\r /g, '\r').replace(/ \r/g, '\r').replace(/\n /g, '\n').replace(/ \n/g, '\n')
  .replace(/[\r\n]{3,}/g, '\n');
  return tmp;
}
