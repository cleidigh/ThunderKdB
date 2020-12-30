// Copyright (c) 2016, Jörg Knobloch. All rights reserved.
// Ace Editor: Copyright (c) 2010, Ajax.org B.V. All rights reserved.

/* global Preferences */

// Add preferences info (see developer.thunderbird.net/add-ons/updates/tb68).
Preferences.addAll([
  { id: "extensions.thunderHTMLedit.WrapWidth", type: "int" },
  { id: "extensions.thunderHTMLedit.FontSize", type: "int" },
  { id: "extensions.thunderHTMLedit.FontFamily", type: "string" },
  { id: "extensions.thunderHTMLedit.DarkTheme", type: "bool" },
  { id: "extensions.thunderHTMLedit.ReplaceTabs", type: "bool" },
  { id: "extensions.thunderHTMLedit.OptionsJSON", type: "string" },
  { id: "extensions.thunderHTMLedit.License", type: "string" },
]);

function licenseColour() {
  const input = document.getElementById("License");
  if (window.opener.ThunderHTMLedit_.hasLicense()) {
    input.setAttribute("style", "color: green");
  } else {
    input.setAttribute("style", "color: red");
  }
}

Preferences.get("extensions.thunderHTMLedit.License").on("change", licenseColour);

window.addEventListener("load", () => {
  licenseColour();
});
