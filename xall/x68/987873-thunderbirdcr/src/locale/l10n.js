String.defaultLocale = "en";

var userLocale = navigator && (navigator.language || navigator.userLanguage) || String.defaultLocale;

var localizationsJson =
{
  "ar":
  {
    "lang_arabic": "عربى",
    "lang_german": "ألمانية",
    "lang_english": "الإنجليزية",
    "lang_spanish": "الأسبانية",
    "lang_french": "فرنسي",
    "lang_hebrew": "اللغة العبرية",
    "lang_italian": "إيطالي",
    "lang_japanese": "اليابانية",
    "lang_dutch": "هولندي",
    "lang_polish": "تلميع",
    "lang_portuguese": "البرتغالية",
    "lang_romanian": "روماني",
    "lang_russian": "الروسية",
    "lang_turkish": "اللغة التركية",
    "lang_chinese": "صينى",
    "no_result": "لا نتيجة",
    "search_label": "بحث"
  },
  "de":
  {
    "lang_arabic": "Arabisch",
    "lang_german": "Deutsch",
    "lang_english": "English",
    "lang_spanish": "Spanisch",
    "lang_french": "Französisch",
    "lang_hebrew": "Hebräisch",
    "lang_italian": "Italienisch",
    "lang_japanese": "Japanisch",
    "lang_dutch": "Dutch",
    "lang_polish": "Polish",
    "lang_portuguese": "Portugiesisch",
    "lang_romanian": "Rumänisch",
    "lang_russian": "russisch",
    "lang_turkish": "Türkisch",
    "lang_chinese": "Chinese",
    "no_result": "Kein Ergebnis",
    "search_label": "Suche"
  },
  "en":
  {
    "lang_arabic": "Arabic",
    "lang_german": "German",
    "lang_english": "English",
    "lang_spanish": "Spanish",
    "lang_french": "French",
    "lang_hebrew": "Hebrew",
    "lang_italian": "Italian",
    "lang_japanese": "Japanese",
    "lang_dutch": "Dutch",
    "lang_polish": "Polish",
    "lang_portuguese": "Portuguese",
    "lang_romanian": "Romanian",
    "lang_russian": "Russian",
    "lang_turkish": "Turkish",
    "lang_chinese": "Chinese",
    "no_result": "No Result",
    "search_label": "Search"
  },
  "es":
  {
    "lang_arabic": "árabe",
    "lang_german": "alemán",
    "lang_english": "Inglés",
    "lang_spanish": "español",
    "lang_french": "francés",
    "lang_hebrew": "hebreo",
    "lang_italian": "italiano",
    "lang_japanese": "Japonés",
    "lang_dutch": "holandés",
    "lang_polish": "polaco",
    "lang_portuguese": "portugués",
    "lang_romanian": "rumano",
    "lang_russian": "Ruso",
    "lang_turkish": "Turco",
    "lang_chinese": "chino",
    "no_result": "Sin resultados",
    "search_label": "Buscar"
  },
  "fr":
  {
    "lang_arabic": "Arabe",
    "lang_german": "Allemand",
    "lang_english": "Anglais",
    "lang_spanish": "Espagnol",
    "lang_french": "Français",
    "lang_hebrew": "Hébreu",
    "lang_italian": "Italien",
    "lang_japanese": "Japonais",
    "lang_dutch": "Néerlandais",
    "lang_polish": "Polonais",
    "lang_portuguese": "Portugais",
    "lang_romanian": "roumain",
    "lang_russian": "Russe",
    "lang_turkish": "Turc",
    "lang_chinese": "Chinois",
    "no_result": "Pas de résultat",
    "search_label": "Rechercher"
  },
  "he":
  {
    "lang_arabic": "עֲרָבִית",
    "lang_german": "גֶרמָנִיָת",
    "lang_english": "אנגלית",
    "lang_spanish": "ספרדית",
    "lang_french": "צָרְפָתִית",
    "lang_hebrew": "עִברִית",
    "lang_italian": "אִיטַלְקִית",
    "lang_japanese": "יַפָּנִית",
    "lang_dutch": "הוֹלַנדִי",
    "lang_polish": "פולני",
    "lang_portuguese": "פורטוגזית",
    "lang_romanian": "רומני",
    "lang_russian": "רוּסִי",
    "lang_turkish": "טורקי",
    "lang_chinese": "סִינִית",
    "no_result": "אין תוצאה",
    "search_label": "לחפש"
  },
  "it":
  {
    "lang_arabic": "arabo",
    "lang_german": "tedesco",
    "lang_english": "inglese",
    "lang_spanish": "spagnolo",
    "lang_french": "francese",
    "lang_hebrew": "ebraico",
    "lang_italian": "italiano",
    "lang_japanese": "giapponese",
    "lang_dutch": "olandese",
    "lang_polish": "polacco",
    "lang_portuguese": "portoghese",
    "lang_romanian": "rumeno",
    "lang_russian": "russo",
    "lang_turkish": "turco",
    "lang_chinese": "cinese",
    "no_result": "Nessun risultato",
    "search_label": "Cerca"
  },
  "ja":
  {
    "lang_arabic": "アラビア語",
    "lang_german": "ドイツ語",
    "lang_english": "英語",
    "lang_spanish": "スペイン語",
    "lang_french": "フランス語",
    "lang_hebrew": "ヘブライ語",
    "lang_italian": "イタリア語",
    "lang_japanese": "日本語",
    "lang_dutch": "オランダ語",
    "lang_polish": "ポーランド語",
    "lang_portuguese": "ポルトガル語",
    "lang_romanian": "ルーマニア語",
    "lang_russian": "ロシア語",
    "lang_turkish": "トルコ語",
    "lang_chinese": "中国語",
    "no_result": "検索結果なし",
    "search_label": "検索"
  },
  "nl":
  {
    "lang_arabic": "Arabisch",
    "lang_german": "Duits",
    "lang_english": "Engels",
    "lang_spanish": "Spaans",
    "lang_french": "Frans",
    "lang_hebrew": "Hebreeuws",
    "lang_italian": "Italiaans",
    "lang_japanese": "Japans",
    "lang_dutch": "Nederlands",
    "lang_polish": "Pools",
    "lang_portuguese": "Portugees",
    "lang_romanian": "Roemeens",
    "lang_russian": "Russisch",
    "lang_turkish": "Turks",
    "lang_chinese": "Chinees",
    "no_result": "Geen resultaat",
    "search_label": "Zoeken"
  },
  "pl":
  {
    "lang_arabic": "arabski",
    "lang_german": "niemiecki",
    "lang_english": "angielski",
    "lang_spanish": "hiszpański",
    "lang_french": "francuski",
    "lang_hebrew": "hebrajski",
    "lang_italian": "włoski",
    "lang_japanese": "japoński",
    "lang_dutch": "holenderski",
    "lang_polish": "polski",
    "lang_portuguese": "portugalski",
    "lang_romanian": "rumuński",
    "lang_russian": "rosyjski",
    "lang_turkish": "turecki",
    "lang_chinese": "chiński",
    "no_result": "Brak wyników",
    "search_label": "Wyszukaj"
  },
  "pt":
  {
    "lang_arabic": "árabe",
    "lang_german": "alemão",
    "lang_english": "Inglês",
    "lang_spanish": "espanhol",
    "lang_french": "francês",
    "lang_hebrew": "hebraico",
    "lang_italian": "italiano",
    "lang_japanese": "Japonês",
    "lang_dutch": "holandês",
    "lang_polish": "polonês",
    "lang_portuguese": "português",
    "lang_romanian": "romeno",
    "lang_russian": "russo",
    "lang_turkish": "turco",
    "lang_chinese": "chinês",
    "no_result": "Sem resultado",
    "search_label": "Pesquisar"
  },
  "ro":
  {
    "lang_arabic": "arabă",
    "lang_german": "germană",
    "lang_english": "Engleză",
    "lang_spanish": "spaniolă",
    "lang_french": "franceză",
    "lang_hebrew": "ebraică",
    "lang_italian": "italiană",
    "lang_japanese": "japoneză",
    "lang_dutch": "olandeză",
    "lang_polish": "poloneză",
    "lang_port Portuguese": "Portugheză",
    "lang_romanian": "română",
    "lang_russian": "rusă",
    "lang_turkish": "turcă",
    "lang_chinese": "chinezesc",
    "no_result": "Nici un rezultat",
    "search_label": "Căutare"
  },
  "ru":
  {
    "lang_arabic": "арабский",
    "lang_german": "Немецкий",
    "lang_english": "английский",
    "lang_spanish": "испанский",
    "lang_french": "французский",
    "lang_hebrew": "Иврит",
    "lang_italian": "итальянский",
    "lang_japanese": "японский",
    "lang_dutch": "голландский",
    "lang_polish": "Польский",
    "lang_portugintage": "Португальский",
    "lang_romanian": "румынский",
    "lang_russian": "Русский",
    "lang_turkish": "Турецкий",
    "lang_chinese": "китайский",
    "no_result": "Безрезультатно",
    "search_label": "Искать"
  },
  "tr":
  {
    "lang_arabic": "Arapça",
    "lang_german": "Almanca",
    "lang_english": "İngilizce",
    "lang_spanish": "İspanyolca",
    "lang_french": "Fransızca",
    "lang_hebrew": "İbranice",
    "lang_italian": "İtalyanca",
    "lang_japanese": "Japonca",
    "lang_dutch": "Hollandaca",
    "lang_polish": "Lehçe",
    "lang_portuguese": "Portekizce",
    "lang_romanian": "Romence",
    "lang_russian": "Rusça",
    "lang_turkish": "Türkçe",
    "lang_chinese": "Çince",
    "no_result": "Sonuç yok",
    "search_label": "Ara"
  },
  "zh":
  {
    "lang_arabic": "阿拉伯語",
    "lang_german": "德語",
    "lang_english": "英語",
    "lang_spanish": "西班牙語",
    "lang_french": "法語",
    "lang_hebrew": "希伯來語",
    "lang_italian": "意大利語",
    "lang_japanese": "日語",
    "lang_dutch": "荷蘭語",
    "lang_polish": "波蘭",
    "lang_portuguese": "葡萄牙語",
    "lang_romanian": "羅馬尼亞語",
    "lang_russian": "俄語",
    "lang_turkish": "土耳其語",
    "lang_chinese": "中文",
    "no_result": "沒有結果",
    "search_label": "搜索"
  },
  "zh-TW":
  {
    "lang_arabic": "阿拉伯语",
    "lang_german": "德语",
    "lang_english": "英语",
    "lang_spanish": "西班牙语",
    "lang_french": "法语",
    "lang_hebrew": "希伯来语",
    "lang_italian": "意大利语",
    "lang_japanese": "日语",
    "lang_dutch": "荷兰语",
    "lang_polish": "波兰",
    "lang_portuguese": "葡萄牙语",
    "lang_romanian": "罗马尼亚语",
    "lang_russian": "俄语",
    "lang_turkish": "土耳其语",
    "lang_chinese": "中文",
    "no_result": "没有结果",
    "search_label": "搜索"
  }
}

String.prototype.toLocaleString = function () {
  let parts = userLocale.split("-")
  , i = parts.length;

  do {
    let locale = parts.slice(0, i).join("-");
    if (localizationsJson[locale]) {
      return localizationsJson[locale][this.toString()] || this;
    }
  }
  while(--i >= 1);

  return  localizationsJson[String.defaultLocale][this.toString()] || this; // "en"
}
