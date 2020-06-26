"use strict";

let $ = (selector) => document.querySelector(selector);

async function setupEditor() {
  $("#city").value = await getSetting("city", "Paris");
  $("#picked").href = "http://openweathermap.org/find?q=" + $("#city").value;
  $("#city").addEventListener("change", function() {
    $("#picked").href = "http://openweathermap.org/find?q=" + $("#city").value;
    browser.runtime.sendMessage({
      type: "city",
      value: $("#city").value,
    });
  });

  $("#theme-mode").value = await getSetting("theme-mode", "automatic");
  $("#theme-mode").addEventListener("change", function() {
    browser.runtime.sendMessage({
      type: "theme-mode",
      value: $("#theme-mode").value,
    });
  });
}

window.onload = setupEditor;
