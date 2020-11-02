var prefManager = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch("extensions.thunderbirdcr.");

var pairsJson =
{
  "ar": {"language": "lang_arabic", "targets": ["de", "en", "es", "fr", "he", "it", "pt", "ru", "tr"]},
  "de": {"language": "lang_german", "targets": ["ar", "en", "es", "fr", "he", "it", "ja", "nl", "pl", "pt", "ro", "ru", "tr"]},
  "en": {"language": "lang_english", "targets": ["ar", "de", "es", "fr", "he", "it", "ja", "nl", "pl", "pt", "ro", "ru", "tr", "zh"]},
  "es": {"language": "lang_spanish", "targets": ["ar", "de", "en", "fr", "he", "it", "ja", "nl", "pl", "pt", "ro", "ru", "tr", "zh"]},
  "fr": {"language": "lang_french", "targets": ["ar", "de", "en", "es", "he", "it", "ja", "nl", "pl", "pt", "ro", "ru", "tr", "zh"]},
  "he": {"language": "lang_hebrew", "targets":  ["ar", "de", "en", "es", "fr", "it", "nl", "pt", "ru"]},
  "it": {"language": "lang_italian", "targets": ["ar", "de", "en", "es", "fr", "he", "ja", "nl", "pl", "pt", "ro", "ru", "tr"]},
  "ja": {"language": "lang_japanese", "targets": ["de", "en", "es", "fr", "it", "pt", "ru"]},
  "nl": {"language": "lang_dutch", "targets":  ["de", "en", "es", "fr", "he", "it", "pt", "ru"]},
  "pl": {"language": "lang_polish", "targets":  ["de", "en", "es", "fr", "it"]},
  "pt": {"language": "lang_portuguese", "targets": ["ar", "de", "en", "es", "fr", "he", "it", "ja", "nl", "ru", "tr"]},
  "ro": {"language": "lang_romanian", "targets":  ["de", "en", "es", "fr", "it", "tr"]},
  "ru": {"language": "lang_russian", "targets": ["ar", "de", "en", "es", "fr", "he", "it", "ja", "nl", "pt"]},
  "tr": {"language": "lang_turkish", "targets":  ["ar", "de", "en", "es", "fr", "it", "pt", "ro"]},
  "zh": {"language": "lang_chinese", "targets": ["en", "es", "fr"]}
};

var searchHistories = {};

var currentHistoryId = 0;

const maxHistoriesLength = 25;

var lastSearchText = "";

var saveLanguages = function() {
  prefManager.setStringPref("sourceLang", $("#source-lang").val());
  prefManager.setStringPref("targetLang", $("#target-lang").val());
}

var restoreLanguages = function() {
  $("#source-lang").val(prefManager.getStringPref("sourceLang"));
  $("#target-lang").val(prefManager.getStringPref("targetLang"));
}

var historyForward = function() {
  currentHistoryId++;
  if (currentHistoryId < Object.keys(searchHistories).length) {
    var wordLangs = searchHistories[currentHistoryId];
    $('#search-text').val(wordLangs[0]);
    var langs = wordLangs[1].split('-');
    $('#source-lang').val(langs[0]);
    changedSourceLang(langs[0]);
    $('#target-lang').val(langs[1]);
    apiCaller(wordLangs[0]);
  } else {
    $('#search-text').val("");
    clearAllResult();
    restoreLanguages();
    $('#history-forward').attr('disabled', 'disabled');
  }
  $('#history-back').removeAttr('disabled');
}

var historyBack = function() {
  currentHistoryId--;
  if (currentHistoryId >= 0) {
    var wordLangs = searchHistories[currentHistoryId];
    $('#search-text').val(wordLangs[0]);
    var langs = wordLangs[1].split('-');
    $('#source-lang').val(langs[0]);
    changedSourceLang(langs[0]);
    $('#target-lang').val(langs[1]);
    apiCaller(wordLangs[0]);
    if (currentHistoryId == 0) {
      $('#history-back').attr('disabled', 'disabled');
    }
  }
  $('#history-forward').removeAttr('disabled');
}

var saveHistory = function(searchText) {
  searchText = searchText.trim();
  currentHistoryId = Object.keys(searchHistories).length;
  var i = 0;
  var duplicated = false;
  Object.keys(searchHistories).forEach(key => {
    if (searchText == searchHistories[key][0]) {
      i = parseInt(key);
      duplicated = true;
      return;
    }
  });
  if (duplicated || currentHistoryId >= maxHistoriesLength) {
    for (i; i < currentHistoryId - 1; i++) {
      searchHistories[i] = searchHistories[i + 1];
      prefManager.setStringPref("history.id" + String(i) + ".word", searchHistories[i][0]);
      prefManager.setStringPref("history.id" + String(i) + ".langs", searchHistories[i][1]);
    }
    currentHistoryId--;
  }
  var langs = $("#source-lang").val() + "-" + $("#target-lang").val();
  searchHistories[currentHistoryId] = [searchText, langs];
  prefManager.setStringPref("history.id" + String(currentHistoryId) + ".word", searchHistories[currentHistoryId][0]);
  prefManager.setStringPref("history.id" + String(currentHistoryId) + ".langs", searchHistories[currentHistoryId][1]);
}

var clearAllResult = function() {
  $("#translate-result").empty();
  $("#dictionary-entries").empty();
}

var newInput = function() {
  clearAllResult();
  currentHistoryId = Object.keys(searchHistories).length;
  if (currentHistoryId > 0) {
    $('#history-back').removeAttr('disabled');
  }
  $('#history-forward').attr('disabled', 'disabled');
}

$(document).on('input', '#search-text', newInput);

var newSearch = function(sourceText) {
  if (sourceText && sourceText !== "") {
    apiCaller(sourceText, "", true);
  }
}

var apiCaller = function(sourceText, targetText, isNew) {
  $('.loading').show();
  saveLanguages();
  targetText = (targetText || "").trim();
  lastSearchText = sourceText;
  console.log("translate for key:" + sourceText + ", " + targetText);

  var tResult = $("#translate-result");
  var dEntries = $("#dictionary-entries");
  tResult.empty();

  if (targetText === "") {
    dEntries.empty();
  }

  $.ajax({
    url: "https://context.reverso.net/bst-query-service",
    dataType: "json",
    type: "post",
    contentType: "application/json",
    data: JSON.stringify( {
      "source_text": sourceText,
      "target_text": targetText,
      "source_lang": $('#source-lang').val(),
      "target_lang": $('#target-lang').val(),
      "npage": 1,
      "mode": 0 } ),
    processData: false,
    success: function(data, textStatus, jQxhr){
        if (data) {
          tResult.empty();
          if (data.list && data.list.length > 0) {
            data.list.forEach(result => {
              var resNode = $("<li class='mdc-list-item'></li>");
              var nodeContent = $("<span class='mdc-list-item__text'></span>")
              var sText = $("<span class='mdc-list-item__primary-text context-source'>" + result.s_text + "</span>");
              var tText = $("<span class='mdc-list-item__secondary-text context-target'>" + result.t_text + "</span>");
              nodeContent.append(sText);
              nodeContent.append(tText);
              resNode.append(nodeContent);
              tResult.append(resNode);
            });
            if (data.dictionary_entry_list && data.dictionary_entry_list.length > 0) {
              if (targetText === "") {
                data.dictionary_entry_list.forEach(entry => {
                  var entryNode = $('<div class="flex-column"></div>');
                  var aLink = $('<a class="rr-button"></a>');
                  aLink.append('<span>' + entry.term + '</span>');
                  aLink.click(function() {
                    $('#dictionary-entries a.selected').removeClass('selected');
                    $(this).addClass('selected');
                    apiCaller(sourceText, entry.term, false);
                  });
                  entryNode.append(aLink);
                  dEntries.append(entryNode);
                });
              }
            }
            if (isNew) {
              saveHistory(sourceText);
              $('#history-forward').removeAttr('disabled');
            }
          } else{
            var errorNode = $("<div class='error-comment'></div>")
            errorNode.text("no_result".toLocaleString());
            tResult.append(errorNode);
          }
        } else {
          console.log("Unexpected error occurred.");
          tResult.append("Unexpected error occurred.");
        }
        setTimeout(function() { $('.loading').hide(); }, 500);
    },
    error: function(jqXhr, textStatus, errorThrown){
      console.log(textStatus);
      tResult.append(textStatus);
      setTimeout(function() { $('.loading').hide(); }, 500);
    }
  });
}

var changedSourceLang = function(sLang) {
  var tLang = $('#target-lang').val();
  $('#target-lang').empty();
  $.each(pairsJson[sLang].targets, function(key, val) {
    var option = new Option(pairsJson[val].language.toLocaleString(), val);
    $('#target-lang').append($(option));
  });
  $("#target-lang option[value=" + tLang + "]").prop("selected","selected");
  saveLanguages();
}


var changedTargetLang = function() {
  saveLanguages();
}

var exchangeLang = function() {
  var sLang = $('#source-lang').val();
  var tLang = $('#target-lang').val();
  $('#source-lang').val(tLang);
  changedSourceLang(tLang);
  $('#target-lang').val(sLang);
  saveLanguages();
}

$(function() {
  console.log("window onload().");

  /** Activate search-text field. **/
  $("#search-text").attr("placeholder", "search_label".toLocaleString());
  [].forEach.call(document.querySelectorAll('.mdc-text-field'), function(el) {
    mdc.textField.MDCTextField.attachTo(el);
  });

  $('#source-lang').empty();
  $('#target-lang').empty();
  $.each(pairsJson, function(key, val) {
    var option = new Option(val.language.toLocaleString(), key);
    $('#source-lang').append($(option));
  });

  // Restore languages from preferences.
  var sLang = prefManager.getStringPref("sourceLang");
  var tLang = prefManager.getStringPref("targetLang");
  $.each(pairsJson[sLang].targets, function(key, val) {
    var option = new Option(pairsJson[val].language.toLocaleString(), val);
    $('#target-lang').append($(option));
  });
  $("#source-lang").val(sLang);
  $("#target-lang").val(tLang);

  // Load histories.
  try {
    for (var i = 0; i < maxHistoriesLength; i++) {
      var wordInPref = prefManager.getStringPref("history.id" + String(i) + ".word");
      if (wordInPref) {
        var langsInPref = prefManager.getStringPref("history.id" + String(i) + ".langs");
        searchHistories[i] = [wordInPref, langsInPref];
      } else {
        break;
      }
    }
  } catch (e) {
    console.log(e);
    if (e.name !== "NS_ERROR_UNEXPECTED") {
      throw e;
    }
  }

  currentHistoryId = Object.keys(searchHistories).length;
  if (currentHistoryId > 0) {
    $('#history-back').removeAttr('disabled');
  }
  $('.loading').hide();
});

window.addEventListener("message", function(data) {
  var searchObj = JSON.parse(data.data);
  if (lastSearchText !== searchObj.searchText) {
    newInput();
    $("#search-text").val(searchObj.searchText);
    newSearch(searchObj.searchText);
  }
});
