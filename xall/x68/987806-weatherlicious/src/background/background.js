"use strict";

async function getWeatherIcon() {
  let city = await getSetting("city", "Paris");
  try {
    let response = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=bf50db4c14a52153ce0ff4a9c84a3851`);
    let { weather } = await response.json();
    let [{icon}] = weather;
    return icon;
  } catch(e) {
    await browser.notifications.create({
      type: "basic",
      title: "Weatherlicious",
      message: `Could not get weather for ${city}`
    });
    let date = new Date();
    let hours = date.getHours();
    if (hours >= 8 && hours < 20) {
      return "01d";
    }
    return "01n";
  }
}
async function setTheme() {
  let icon = await getWeatherIcon();
  let themeMode = await getSetting("theme-mode", "automatic");
  if (themeMode != "automatic") {
    icon = icon.replace(/(d|n)/g, themeMode);
  }

  let theme = {
    images: {
      additional_backgrounds: [],
    },
    colors: {
      frame: "black",
      tab_background_text: "white",
    },
    properties: {
      additional_backgrounds_tiling: ["no-repeat", "repeat-y"],
      additional_backgrounds_alignment: ["right top", "left top"]
    }
  };

  if (icon.endsWith("d")) {
    theme.colors = {
      frame: "#a1e1f2",
      tab_line: "#0a84ff",
      tab_background_text: "black",
      toolbar_top_separator: "transparent"
    };
    theme.images.additional_backgrounds[1] = "gradients/day.png";
  } else {
    theme.colors = {
      frame: "#202340",
      tab_background_text: "rgba(255,255,255,0.8)",
      bookmark_text: "rgba(255,255,255,0.6)",
      toolbar: "rgba(0,0,0,0.5)",
      toolbar_field: "rgba(255,255,255,0.2)",
      toolbar_field_text: "white",
      toolbar_field_border_focus: "#8a0060",
      tab_line: "#b5007f",
      popup: "#0d172b",
      popup_text: "rgba(255,255,255,0.8)",
      popup_border: "rgba(255,255,255,0.2)",
      popup_highlight: "#8a0060",
      popup_highlight_text: "#fff",
      sidebar: "#0d172b",
      sidebar_text: "rgba(255,255,255,0.8)",
      sidebar_border: "rgb(38,47,65)",
      sidebar_highlight: "#8a0060",
      sidebar_highlight_text: "#fff",
      ntp_background: "#101120",
      ntp_text: "rgba(255,255,255,0.8)",
      toolbar_top_separator: "transparent",
      toolbar_bottom_separator: "rgba(255,255,255,0.05)",
    };
  }

  switch (icon) {
    case "01d":
      // clear sky
      theme.images.additional_backgrounds[0] = "icons/sunny.svg";
      break;
    case "01n":
      // clear sky
      theme.images.additional_backgrounds[0] = "icons/moon.svg";
      break;
    case "02d":
      // few clouds
      theme.images.additional_backgrounds[0] = "icons/sunny-cloudy.svg";
      break;
    case "02n":
      // few clouds
      theme.images.additional_backgrounds[0] = "icons/moon-cloudy.svg";
      break;
    case "03d":
    case "03n":
      // scattered clouds
      theme.images.additional_backgrounds[0] = "icons/cloudy.svg";
      break;
    case "04d":
    case "04n":
      // broken clouds
      theme.images.additional_backgrounds[0] = "icons/cloudy.svg";
      break;
    case "09d": // shower rain
    case "09n":
    case "10d": // rain
    case "10n":
      theme.colors.tab_line = "#363959";
      theme.images.additional_backgrounds[0] = "icons/rainy.svg";
      if (icon.endsWith("d")) {
        theme.colors.frame = "#89bed0";
        theme.colors.tab_background_text = "rgba(255,255,255,0.8)";
        theme.colors.toolbar = "rgba(0,0,0,0.2)";
        theme.colors.bookmark_text = "white";
        theme.colors.toolbar_field = "rgba(0,0,0,0.1)";
        theme.colors.toolbar_field_text = "white";
        theme.images.additional_backgrounds[1] = "gradients/rainy.png";
      } else {
        theme.colors.frame = "#010d1c";
        theme.colors.toolbar_field_border_focus = "#334a8a";
        theme.colors.popup_highlight = "#334a8a";
        theme.colors.sidebar_highlight = "#334a8a";
        theme.colors.toolbar = "rgba(200,200,255,0.2)";
        theme.colors.toolbar_field = "rgba(255,255,255,0.1)";
        theme.images.additional_backgrounds[1] = "gradients/rainy-night.png";
      }
      break;
    case "11d":
    case "11n":
      // thunderstorm
      if (icon.endsWith("d")) {
        theme.colors.frame = "#89bed0";
      }
      theme.colors.tab_line = "#363959";
      theme.colors.toolbar_field_border_focus = "#334a8a";
      theme.colors.popup_highlight = "#334a8a";
      theme.colors.sidebar_highlight = "#334a8a";
      theme.colors.toolbar = "rgba(0,0,0,0.2)";
      theme.colors.bookmark_text = "white";
      theme.colors.toolbar_field = "rgba(0,0,0,0.1)";
      theme.colors.toolbar_field_text = "white";
      theme.images.additional_backgrounds[0] = "icons/stormy.svg";
      theme.images.additional_backgrounds[1] = "gradients/rainy-night.png";
      break;
    case "13d":
    case "13n":
      // snow
      theme.colors.tab_line = "#363959";
      theme.colors.toolbar_field_border_focus = "#334a8a";
      theme.colors.popup_highlight = "#334a8a";
      theme.colors.sidebar_highlight = "#334a8a";
      theme.colors.toolbar = "rgba(0,0,0,0.2)";
      theme.colors.bookmark_text = "white";
      theme.colors.toolbar_field = "rgba(0,0,0,0.1)";
      theme.colors.toolbar_field_text = "white";
      theme.images.additional_backgrounds[1] = "gradients/mist-storm.png";
      theme.images.additional_backgrounds[0] = "icons/snowy.svg";
      break;
    case "50d":
    case "50n":
      // mist
      if (icon.endsWith("d")) {
        theme.colors.frame = "#bfcfde";
      }

      theme.colors.toolbar = "rgba(0,0,0,0.2)";
      theme.colors.bookmark_text = "white";
      theme.colors.toolbar_field = "rgba(255,255,255,0.1)";
      theme.colors.tab_line = "#10293d";
      theme.colors.toolbar_field_border_focus = "#10293d";
      theme.colors.popup_highlight = "#10293d";
      theme.colors.sidebar_highlight = "#10293d";
      theme.images.additional_backgrounds[0] = "icons/cloudy.svg";
      theme.images.additional_backgrounds[1] = "gradients/mist-storm.png";
      break;
  }
  await browser.theme.update(theme);
}

setTheme();

browser.alarms.onAlarm.addListener(setTheme);
browser.alarms.create("checkTime", {periodInMinutes: 5});

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.type) {
    case "city":
      await setSetting("city", message.value);
      await setTheme();
      break;
    case "theme-mode":
      await setSetting("theme-mode", message.value);
      await setTheme();
      break;
  }
});
