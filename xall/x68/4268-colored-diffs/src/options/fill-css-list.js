/* SPDX-License-Identifier: MPL-2.0 */

const styles = [
    { "file": "agate",                     "name" : "Agate"                     },
    { "file": "a11y-dark",                 "name" : "A11y Dark"                 },
    { "file": "a11y-light",                "name" : "A11y Light"                },
    { "file": "androidstudio",             "name" : "Android Studio"            },
    { "file": "an-old-hope",               "name" : "An Old Hope"               },
    { "file": "arduino-light",             "name" : "Arduino Light"             },
    { "file": "arta",                      "name" : "Arta"                      },
    { "file": "ascetic",                   "name" : "Ascetic"                   },
    { "file": "atelier-cave-dark",         "name" : "Atelier Cave Dark"         },
    { "file": "atelier-cave-light",        "name" : "Atelier Cave Light"        },
    { "file": "atelier-dune-dark",         "name" : "Atelier Dune Dark"         },
    { "file": "atelier-dune-light",        "name" : "Atelier Dune Light"        },
    { "file": "atelier-estuary-dark",      "name" : "Atelier Estuary Dark"      },
    { "file": "atelier-estuary-light",     "name" : "Atelier Estuary Light"     },
    { "file": "atelier-forest-dark",       "name" : "Atelier Forest Dark"       },
    { "file": "atelier-forest-light",      "name" : "Atelier Forest Light"      },
    { "file": "atelier-heath-dark",        "name" : "Atelier Heath Dark"        },
    { "file": "atelier-heath-light",       "name" : "Atelier Heath Light"       },
    { "file": "atelier-lakeside-dark",     "name" : "Atelier Lakeside Dark"     },
    { "file": "atelier-lakeside-light",    "name" : "Atelier Lakeside Light"    },
    { "file": "atelier-plateau-dark",      "name" : "Atelier Plateau Dark"      },
    { "file": "atelier-plateau-light",     "name" : "Atelier Plateau Light"     },
    { "file": "atelier-savanna-dark",      "name" : "Atelier Savanna Dark"      },
    { "file": "atelier-savanna-light",     "name" : "Atelier Savanna Light"     },
    { "file": "atelier-seaside-dark",      "name" : "Atelier Seaside Dark"      },
    { "file": "atelier-seaside-light",     "name" : "Atelier Seaside Light"     },
    { "file": "atelier-sulphurpool-dark",  "name" : "Atelier Sulphurpool Dark"  },
    { "file": "atelier-sulphurpool-light", "name" : "Atelier Sulphurpool Light" },
    { "file": "atom-one-dark",             "name" : "Atom One Dark"             },
    { "file": "atom-one-dark-reasonable",  "name" : "Atom One Dark Reasonable"  },
    { "file": "atom-one-light",            "name" : "Atom One Light"            },
    { "file": "brown-paper",               "name" : "Brown Paper"               },
    { "file": "codepen-embed",             "name" : "Codepen Embed"             },
    { "file": "color-brewer",              "name" : "Color Brewer"              },
    { "file": "darcula",                   "name" : "Darcula"                   },
    { "file": "dark",                      "name" : "Dark"                      },
    { "file": "default",                   "name" : "Default"                   },
    { "file": "docco",                     "name" : "Docco"                     },
    { "file": "dracula",                   "name" : "Dracula"                   },
    { "file": "far",                       "name" : "Far"                       },
    { "file": "foundation",                "name" : "Foundation"                },
    { "file": "github",                    "name" : "Github"                    },
    { "file": "github-gist",               "name" : "Github Gist"               },
    { "file": "gml",                       "name" : "GML"                       },
    { "file": "googlecode",                "name" : "Googlecode"                },
    { "file": "gradient-dark",             "name" : "Gradient Dark"             },
    { "file": "gradient-light",            "name" : "Gradient Light"            },
    { "file": "grayscale",                 "name" : "Grayscale"                 },
    { "file": "gruvbox-dark",              "name" : "Gruvbox Dark"              },
    { "file": "gruvbox-light",             "name" : "Gruvbox Light"             },
    { "file": "hopscotch",                 "name" : "Hopscotch"                 },
    { "file": "hybrid",                    "name" : "Hybrid"                    },
    { "file": "idea",                      "name" : "Idea"                      },
    { "file": "ir-black",                  "name" : "Ir Black"                  },
    { "file": "isbl-editor-dark",          "name" : "Isbl Editor Dark"          },
    { "file": "isbl-editor-light",         "name" : "Isbl Editor Light"         },
    { "file": "kimbie.dark",               "name" : "Kimbie Dark"               },
    { "file": "kimbie.light",              "name" : "Kimbie Light"              },
    { "file": "lightfair",                 "name" : "Lightfair"                 },
    { "file": "lioshi",                    "name" : "Lioshi"                    },
    { "file": "magula",                    "name" : "Magula"                    },
    { "file": "mono-blue",                 "name" : "Mono Blue"                 },
    { "file": "monokai",                   "name" : "Monokai"                   },
    { "file": "monokai-sublime",           "name" : "Monokai Sublime"           },
    { "file": "night-owl",                 "name" : "Night Owl"                 },
    { "file": "nnfx",                      "name" : "NNFX"                      },
    { "file": "nnfx-dark",                 "name" : "NNFX Dark"                 },
    { "file": "nord",                      "name" : "Nord"                      },
    { "file": "obsidian",                  "name" : "Obsidian"                  },
    { "file": "ocean",                     "name" : "Ocean"                     },
    { "file": "paraiso-dark",              "name" : "Paraiso Dark"              },
    { "file": "paraiso-light",             "name" : "Paraiso Light"             },
    { "file": "pojoaque",                  "name" : "Pojoaque"                  },
    { "file": "purebasic",                 "name" : "PureBASIC"                 },
    { "file": "qtcreator_dark",            "name" : "Qt Creator Dark"           },
    { "file": "qtcreator_light",           "name" : "Qt Creator Light"          },
    { "file": "railscasts",                "name" : "Railscasts"                },
    { "file": "rainbow",                   "name" : "Rainbow"                   },
    { "file": "routeros",                  "name" : "RouterOS (MikroTik)"       },
    { "file": "school-book",               "name" : "School Book"               },
    { "file": "shades-of-purple",          "name" : "Shades of Purple"          },
    { "file": "solarized-dark",            "name" : "Solarized Dark"            },
    { "file": "solarized-light",           "name" : "Solarized Light"           },
    { "file": "srcery",                    "name" : "Srcery"                    },
    { "file": "sunburst",                  "name" : "Sunburst"                  },
    { "file": "tomorrow",                  "name" : "Tomorrow"                  },
    { "file": "tomorrow-night-blue",       "name" : "Tomorrow Night Blue"       },
    { "file": "tomorrow-night-bright",     "name" : "Tomorrow Night Bright"     },
    { "file": "tomorrow-night",            "name" : "Tomorrow Night"            },
    { "file": "tomorrow-night-eighties",   "name" : "Tomorrow Night Eighties"   },
    { "file": "vs",                        "name" : "VisualStudio"              },
    { "file": "vs2015",                    "name" : "VisualStudio 2015 Dark"    },
    { "file": "xcode",                     "name" : "XCode"                     },
    { "file": "xt256",                     "name" : "xt256"                     },
    { "file": "zenburn",                   "name" : "Zenburn"                   }
];

let list = document.getElementById("style");
for (let s of styles) {
    let item = document.createElement("option");
    item.value = s.file;
    item.textContent = s.name;
    list.appendChild(item);
}
