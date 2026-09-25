// Personages uit de Leer en Verbonden, voor /tools/persons bij die collectie.
// Selectie en indeling geïnspireerd op de Wikipedia-categorie "Doctrine and
// Covenants people", maar elke beschrijving is zelf geschreven en gecontroleerd
// tegen de Nederlandse tekst en de opschriften van de afdelingen in
// prisma/dcContent.json (de officiële uitgave van de kerk) — geen vertaling
// van Wikipedia. Afdelingsnummers in de beschrijvingen verwijzen naar plekken
// waar de persoon met naam in de verzen of in het opschrift staat.
//
// Slugs beginnen met "lv-": Person.slug is uniek over alle collecties heen,
// en namen als Adam of Mozes komen ook bij andere schriften voor.
// Familiebanden alleen waar ze vaststaan én beide personen hieronder staan.

import type { IntroPersonSeed } from "./introPersons";

export const dcPersons: IntroPersonSeed[] = [
  // De familie Smith
  {
    slug: "lv-joseph-smith",
    name: "Joseph Smith",
    description:
      "De profeet van de herstelling, bij wiens monde de meeste openbaringen in de Leer en Verbonden zijn gegeven. " +
      "Werd geroepen als de eerste ouderling van de kerk (afdeling 20) en ontving samen met Oliver Cowdery het " +
      "Aäronisch priesterschap van Johannes de Doper (afdeling 13). Op 27 juni 1844 met zijn broer Hyrum vermoord " +
      "in de gevangenis van Carthage (afdeling 135).",
    gender: "man",
    fatherSlug: "lv-joseph-smith-sr",
  },
  {
    slug: "lv-emma-smith",
    name: "Emma Smith",
    description:
      "De vrouw van de profeet Joseph Smith. In afdeling 25 noemt de Heer haar 'een uitverkoren vrouw' en krijgt zij " +
      "de opdracht een verzameling heilige lofzangen voor de kerk samen te stellen. Ook genoemd in afdeling 132.",
    gender: "vrouw",
  },
  {
    slug: "lv-joseph-smith-sr",
    name: "Joseph Smith sr.",
    description:
      "De vader van de profeet en een van de acht getuigen van het Boek van Mormon. Afdeling 4 is aan hem gericht. " +
      "Hij was de eerste patriarch van de kerk en lid van de eerste hoge raad (afdeling 102). Na zijn dood noemt de " +
      "Heer hem 'mijn bejaarde dienstknecht', die 'bij Abraham aan zijn rechterhand zit' (afdeling 124).",
    gender: "man",
  },
  {
    slug: "lv-hyrum-smith",
    name: "Hyrum Smith",
    description:
      "Oudere broer van de profeet. Afdeling 11 is aan hem gericht. In afdeling 124 wordt hij geroepen als " +
      "patriarch van de kerk en als profeet, ziener en openbaarder naast Joseph. Werd op 27 juni 1844 samen met " +
      "Joseph in Carthage vermoord (afdeling 135). Vader van Joseph F. Smith.",
    gender: "man",
    fatherSlug: "lv-joseph-smith-sr",
  },
  {
    slug: "lv-samuel-h-smith",
    name: "Samuel H. Smith",
    description:
      "Broer van de profeet en een van de acht getuigen van het Boek van Mormon. Kreeg in afdeling 23 een eigen " +
      "boodschap en werd daarna meermaals op zending geroepen (afdelingen 52, 61, 66 en 75). Lid van de eerste hoge " +
      "raad (afdeling 102).",
    gender: "man",
    fatherSlug: "lv-joseph-smith-sr",
  },
  {
    slug: "lv-william-smith",
    name: "William Smith",
    description: "Jongere broer van de profeet. Wordt in afdeling 124 genoemd als lid van de Twaalf Apostelen.",
    gender: "man",
    fatherSlug: "lv-joseph-smith-sr",
  },
  {
    slug: "lv-don-carlos-smith",
    name: "Don Carlos Smith",
    description:
      "De jongste broer van de profeet. In afdeling 124 (als 'Don C. Smith') aangewezen als president van een " +
      "quorum hogepriesters.",
    gender: "man",
    fatherSlug: "lv-joseph-smith-sr",
  },
  {
    slug: "lv-joseph-f-smith",
    name: "Joseph F. Smith",
    description:
      "Zoon van Hyrum Smith en later president van de kerk. Ontving op 3 oktober 1918 het visioen van de verlossing " +
      "van de doden dat in afdeling 138 staat: de Heiland die de geesten van de doden bezoekt terwijl zijn lichaam " +
      "in het graf ligt.",
    gender: "man",
    fatherSlug: "lv-hyrum-smith",
  },
  {
    slug: "lv-george-a-smith",
    name: "George A. Smith",
    description:
      "Neef van de profeet. Wordt in afdeling 124 genoemd als lid van de Twaalf Apostelen, en in afdeling 136 " +
      "moet hij samen met Amasa Lyman een groep organiseren voor de tocht naar het westen.",
    gender: "man",
  },

  // Getuigen en schrijvers bij het Boek van Mormon
  {
    slug: "lv-oliver-cowdery",
    name: "Oliver Cowdery",
    description:
      "Schrijver bij de vertaling van het Boek van Mormon en een van de drie getuigen (afdeling 17). Ontving samen " +
      "met Joseph Smith het Aäronisch priesterschap (afdeling 13) en werd de tweede ouderling van de kerk (afdeling " +
      "20). Zag met Joseph de Heer, Mozes, Elias en Elia in de tempel te Kirtland (afdeling 110). Aan hem of over " +
      "hem gaan onder meer de afdelingen 6, 8, 9 en 28.",
    gender: "man",
  },
  {
    slug: "lv-warren-a-cowdery",
    name: "Warren A. Cowdery",
    description:
      "Oudere broer van Oliver Cowdery. Werd in afdeling 106 aangewezen als presiderende hogepriester van de " +
      "gemeente in Freedom (New York) en omstreken.",
    gender: "man",
  },
  {
    slug: "lv-martin-harris",
    name: "Martin Harris",
    description:
      "Een van de drie getuigen van het Boek van Mormon (afdeling 17). Hij verloor als schrijver de eerste 116 " +
      "bladzijden van de vertaling (afdelingen 3 en 10). In afdeling 19 krijgt hij het gebod mildelijk van zijn " +
      "bezit te geven voor het drukken van het Boek van Mormon. Afdeling 5 is op zijn verzoek gegeven.",
    gender: "man",
  },
  {
    slug: "lv-peter-whitmer-sr",
    name: "Peter Whitmer sr.",
    description:
      "Bij hem thuis in Fayette (New York) woonde Joseph Smith tot de vertaling van het Boek van Mormon af was, en " +
      "daar werd op 6 april 1830 de kerk opgericht (opschriften van de afdelingen 14 en 21). Vader van David, John " +
      "en Peter Whitmer jr.",
    gender: "man",
  },
  {
    slug: "lv-david-whitmer",
    name: "David Whitmer",
    description:
      "Een van de drie getuigen van het Boek van Mormon (afdeling 17). Afdeling 14 is aan hem gericht, en in " +
      "afdeling 18 krijgt hij samen met Oliver Cowdery de opdracht de Twaalf Apostelen te zoeken.",
    gender: "man",
    fatherSlug: "lv-peter-whitmer-sr",
  },
  {
    slug: "lv-john-whitmer",
    name: "John Whitmer",
    description:
      "Een van de acht getuigen van het Boek van Mormon. Afdeling 15 is aan hem gericht. In afdeling 47 wordt hij " +
      "geroepen om, als opvolger van Oliver Cowdery, de geschiedenis van de kerk bij te houden.",
    gender: "man",
    fatherSlug: "lv-peter-whitmer-sr",
  },
  {
    slug: "lv-peter-whitmer-jr",
    name: "Peter Whitmer jr.",
    description:
      "Een van de acht getuigen van het Boek van Mormon. Afdeling 16 is aan hem gericht. Ging met Oliver Cowdery, " +
      "Parley P. Pratt en Ziba Peterson op zending naar de Lamanieten (afdelingen 30 en 32).",
    gender: "man",
    fatherSlug: "lv-peter-whitmer-sr",
  },
  {
    slug: "lv-hiram-page",
    name: "Hiram Page",
    description:
      "Een van de acht getuigen van het Boek van Mormon. Beweerde met een steen openbaringen voor de kerk te " +
      "ontvangen; in afdeling 28 maakt de Heer duidelijk dat die niet van Hem kwamen en dat alleen de profeet " +
      "openbaring voor de hele kerk ontvangt.",
    gender: "man",
  },
  {
    slug: "lv-joseph-knight-sr",
    name: "Joseph Knight sr.",
    description:
      "Gaf Joseph Smith en zijn schrijver meerdere keren stoffelijke hulp, zodat de vertaling van het Boek van " +
      "Mormon kon doorgaan. Afdeling 12 is aan hem gericht, en in afdeling 23 krijgt hij opnieuw een eigen " +
      "boodschap.",
    gender: "man",
  },
  {
    slug: "lv-polly-knight",
    name: "Polly Knight",
    description:
      "Echtgenote van Joseph Knight sr. Zij stierf op 7 augustus 1831, de dag waarop afdeling 59 werd gegeven, " +
      "als eerste kerklid in Zion (Missouri).",
    gender: "vrouw",
  },
  {
    slug: "lv-newel-knight",
    name: "Newel Knight",
    description:
      "Zoon van Joseph Knight sr. Leidde de heiligen uit Colesville, die in Thompson (Ohio) woonden, naar Missouri " +
      "nadat Leman Copley zijn verbond had verbroken (afdeling 54). Later lid van de hoge raad in Nauvoo " +
      "(afdeling 124).",
    gender: "man",
    fatherSlug: "lv-joseph-knight-sr",
    motherSlug: "lv-polly-knight",
  },

  // Vroege bekeerlingen en zendelingen
  {
    slug: "lv-thomas-b-marsh",
    name: "Thomas B. Marsh",
    description:
      "Afdeling 31 is aan hem gericht, kort na zijn doop in 1830. Werd de eerste president van het Quorum der " +
      "Twaalf Apostelen; afdeling 112 is aan hem als president van dat quorum gegeven.",
    gender: "man",
  },
  {
    slug: "lv-parley-p-pratt",
    name: "Parley P. Pratt",
    description:
      "Ging in 1830 op zending naar de Lamanieten (afdeling 32) en later naar de shakers (afdeling 49). Wordt in " +
      "afdeling 124 genoemd als lid van de Twaalf Apostelen. Oudere broer van Orson Pratt.",
    gender: "man",
  },
  {
    slug: "lv-orson-pratt",
    name: "Orson Pratt",
    description:
      "Was negentien jaar toen afdeling 34 aan hem werd gegeven, zes weken nadat hij zich had laten dopen na de " +
      "prediking van zijn broer Parley. Later lid van de Twaalf Apostelen (afdeling 124).",
    gender: "man",
  },
  {
    slug: "lv-ziba-peterson",
    name: "Ziba Peterson",
    description:
      "Ging in 1830 met Oliver Cowdery, Peter Whitmer jr. en Parley P. Pratt op zending naar de Lamanieten " +
      "(afdeling 32). In afdeling 58 wordt hij getuchtigd omdat hij zijn zonden niet beleed.",
    gender: "man",
  },
  {
    slug: "lv-ezra-thayre",
    name: "Ezra Thayre",
    description:
      "Afdeling 33 is aan hem en Northrop Sweet gericht. In afdeling 56 wordt hij opgeroepen zich te bekeren van " +
      "zijn hoogmoed en zelfzucht.",
    gender: "man",
  },
  {
    slug: "lv-northrop-sweet",
    name: "Northrop Sweet",
    description: "Afdeling 33 is aan hem en Ezra Thayre gericht: een oproep om het evangelie te verkondigen.",
    gender: "man",
  },
  {
    slug: "lv-sidney-rigdon",
    name: "Sidney Rigdon",
    description:
      "Werd in afdeling 35 geroepen als schrijver bij de vertaling van de Bijbel. Zag samen met Joseph Smith het " +
      "visioen van de graden van heerlijkheid (afdeling 76) en werd raadgever van de profeet in het Eerste Presidium " +
      "(afdeling 90).",
    gender: "man",
  },
  {
    slug: "lv-edward-partridge",
    name: "Edward Partridge",
    description:
      "Afdeling 36 is aan hem gericht; volgens Joseph Smiths geschiedenis 'een toonbeeld van godsvrucht'. Werd in " +
      "afdeling 41 geroepen als eerste bisschop van de kerk en kreeg in Missouri de zorg voor de erfdelen van de " +
      "heiligen (afdeling 57).",
    gender: "man",
  },
  {
    slug: "lv-james-covel",
    name: "James Covel",
    description:
      "Was ongeveer veertig jaar voorganger bij de methodisten. Kreeg in afdeling 39 de opdracht zich te laten " +
      "dopen, maar keerde terug naar zijn vroegere geloof en volk (opschrift van afdeling 40).",
    gender: "man",
  },
  {
    slug: "lv-leman-copley",
    name: "Leman Copley",
    description:
      "Had voor zijn doop bij de shakers gehoord. Werd in afdeling 49 met Sidney Rigdon en Parley P. Pratt naar hen " +
      "gezonden. Verbrak daarna zijn verbond om zijn boerderij in Thompson (Ohio) aan de heiligen af te staan " +
      "(opschrift van afdeling 54).",
    gender: "man",
  },
  {
    slug: "lv-sidney-gilbert",
    name: "Algernon Sidney Gilbert",
    description:
      "Afdeling 53 is aan hem gericht. In Missouri werd hij aangewezen als gevolmachtigde van de kerk, om land te " +
      "kopen en een winkel te beginnen voor het welzijn van de heiligen (afdeling 57).",
    gender: "man",
  },
  {
    slug: "lv-william-w-phelps",
    name: "William W. Phelps",
    description:
      "Drukker van beroep. Afdeling 55 is aan hem gericht, en in afdeling 57 wordt hij in Missouri aangesteld als " +
      "drukker voor de kerk. Zag op de rivier de Missouri de verwoester over het water gaan (opschrift van " +
      "afdeling 61).",
    gender: "man",
  },
  {
    slug: "lv-john-murdock",
    name: "John Murdock",
    description:
      "Verloor in 1831 zijn vrouw, Julia Clapp. Werd in afdeling 99 geroepen om in de oostelijke landstreken het " +
      "evangelie te verkondigen, van huis tot huis en van stad tot stad.",
    gender: "man",
  },
  {
    slug: "lv-isaac-morley",
    name: "Isaac Morley",
    description:
      "In afdeling 64 wordt hij berispt omdat hij de wet niet onderhield, maar de Heer zegt ook: 'niettemin heb Ik " +
      "mijn dienstknecht Isaac Morley vergeven'. Zijn boerderij moest worden verkocht.",
    gender: "man",
  },
  {
    slug: "lv-william-e-mclellin",
    name: "William E. McLellin",
    description:
      "Stelde de Heer in het verborgen vijf vragen; afdeling 66 is het antwoord, gegeven bij monde van de profeet, " +
      "die de vragen niet kende. Ook genoemd in afdeling 68.",
    gender: "man",
  },
  {
    slug: "lv-orson-hyde",
    name: "Orson Hyde",
    description:
      "Een van de vier ouderlingen tot wie afdeling 68 zich eerst richt. Hield samen met Oliver Cowdery de notulen " +
      "bij van de eerste hoge raad (afdeling 102) en wordt in afdeling 124 genoemd als lid van de Twaalf Apostelen.",
    gender: "man",
  },
  {
    slug: "lv-john-johnson",
    name: "John Johnson",
    description:
      "Kerklid in Hiram (Ohio), waar de profeet in 1831–1832 bij hem woonde. In afdeling 96 zegt de Heer dat Hij " +
      "zijn offer heeft aangenomen en zijn gebeden gehoord. Lid van de eerste hoge raad (afdeling 102).",
    gender: "man",
  },
  {
    slug: "lv-luke-s-johnson",
    name: "Luke S. Johnson",
    description:
      "Zoon van John Johnson. Een van de vier ouderlingen tot wie afdeling 68 zich eerst richt, en lid van de " +
      "eerste hoge raad (afdeling 102).",
    gender: "man",
    fatherSlug: "lv-john-johnson",
  },
  {
    slug: "lv-lyman-e-johnson",
    name: "Lyman E. Johnson",
    description:
      "Zoon van John Johnson. Een van de vier ouderlingen tot wie afdeling 68 zich eerst richt (zie het opschrift).",
    gender: "man",
    fatherSlug: "lv-john-johnson",
  },

  // Leiders in Kirtland en Missouri
  {
    slug: "lv-newel-k-whitney",
    name: "Newel K. Whitney",
    description:
      "Werd in afdeling 72 geroepen als bisschop in Kirtland. Maakte met de profeet en Sidney Rigdon deel uit van " +
      "de Verenigde Firma (afdeling 78). In afdeling 117 moet hij naar Adam-ondi-Ahman trekken en bisschop zijn " +
      "'niet in naam maar in daad'.",
    gender: "man",
  },
  {
    slug: "lv-frederick-g-williams",
    name: "Frederick G. Williams",
    description:
      "Werd in afdeling 81 geroepen als hogepriester en raadgever van Joseph Smith, en was ook zijn schrijver " +
      "(afdeling 90). Afdeling 92 geeft hem aanwijzingen voor zijn taak in de Verenigde Firma.",
    gender: "man",
  },
  {
    slug: "lv-jesse-gause",
    name: "Jesse Gause",
    description:
      "Werd in maart 1832 geroepen als raadgever van Joseph Smith in het presidium, maar hield geen stand; zijn " +
      "roeping ging over op Frederick G. Williams (opschrift van afdeling 81).",
    gender: "man",
  },
  {
    slug: "lv-stephen-burnett",
    name: "Stephen Burnett",
    description:
      "Afdeling 80 is aan hem gericht: hij moest het evangelie prediken, met Eden Smith als metgezel.",
    gender: "man",
  },
  {
    slug: "lv-eden-smith",
    name: "Eden Smith",
    description: "Werd in afdeling 80 als metgezel aan Stephen Burnett gegeven om samen het evangelie te prediken.",
    gender: "man",
  },
  {
    slug: "lv-reynolds-cahoon",
    name: "Reynolds Cahoon",
    description:
      "Werd samen met Hyrum Smith en Jared Carter aangewezen als bouwcomité in Kirtland (opschrift van afdeling 94).",
    gender: "man",
  },
  {
    slug: "lv-jared-carter",
    name: "Jared Carter",
    description:
      "Afdeling 79 roept hem op zending. Lid van het bouwcomité in Kirtland (afdeling 94) en van de eerste hoge " +
      "raad (afdeling 102).",
    gender: "man",
  },
  {
    slug: "lv-lyman-wight",
    name: "Lyman Wight",
    description:
      "Kwam in 1834 met Parley P. Pratt uit Missouri naar Kirtland om hulp te vragen voor de verdreven heiligen " +
      "(afdeling 103). In afdeling 124 moet hij meebouwen aan het Nauvoo House.",
    gender: "man",
  },
  {
    slug: "lv-lyman-sherman",
    name: "Lyman Sherman",
    description:
      "Een van de zeven presidenten van de Zeventig. Vroeg de profeet om een openbaring over zijn plicht; afdeling " +
      "108 is het antwoord: 'Uw zonden zijn u vergeven.'",
    gender: "man",
  },

  // De Twaalf en leiders in Far West en Nauvoo
  {
    slug: "lv-david-w-patten",
    name: "David W. Patten",
    description:
      "Lid van de Twaalf Apostelen. In afdeling 114 moest hij zijn zaken afwikkelen voor een zending. Kwam in 1838 " +
      "om het leven; in afdeling 124 zegt de Heer dat Hij hem tot Zich heeft genomen.",
    gender: "man",
  },
  {
    slug: "lv-elias-higbee",
    name: "Elias Higbee",
    description:
      "Stelde vragen over de geschriften van Jesaja, onder meer over Jesaja 52:1; de antwoorden staan in afdeling 113.",
    gender: "man",
  },
  {
    slug: "lv-william-marks",
    name: "William Marks",
    description:
      "Kreeg in afdeling 117, samen met Newel K. Whitney, de opdracht Kirtland te verlaten. Wordt ook in afdeling " +
      "124 genoemd.",
    gender: "man",
  },
  {
    slug: "lv-oliver-granger",
    name: "Oliver Granger",
    description:
      "Moest in Kirtland de zaken van het Eerste Presidium afhandelen. In afdeling 117 belooft de Heer dat zijn naam " +
      "'in heilige gedachtenis van geslacht op geslacht' bewaard zal worden: 'wanneer hij valt, zal hij wederom " +
      "opstaan'.",
    gender: "man",
  },
  {
    slug: "lv-brigham-young",
    name: "Brigham Young",
    description:
      "In afdeling 124 aangewezen als president van de Twaalf Apostelen. Afdeling 126 werd bij hem thuis gegeven, " +
      "na zijn zending in Engeland. Afdeling 136 kwam bij zijn monde in Winter Quarters, voor de tocht naar het " +
      "westen.",
    gender: "man",
  },
  {
    slug: "lv-heber-c-kimball",
    name: "Heber C. Kimball",
    description: "Wordt in afdeling 124 als eerste genoemd in de lijst van de Twaalf Apostelen onder Brigham Young.",
    gender: "man",
  },
  {
    slug: "lv-john-taylor",
    name: "John Taylor",
    description:
      "Werd in afdeling 118 geroepen als apostel. Was met Willard Richards bij Joseph en Hyrum Smith in de " +
      "gevangenis van Carthage en werd daar door vier kogels verwond (afdeling 135). Later president van de kerk.",
    gender: "man",
  },
  {
    slug: "lv-willard-richards",
    name: "Willard Richards",
    description:
      "Werd in afdeling 118 geroepen als apostel. Was in de gevangenis van Carthage toen Joseph en Hyrum Smith werden " +
      "vermoord en ontkwam zonder verwonding (afdeling 135).",
    gender: "man",
  },
  {
    slug: "lv-wilford-woodruff",
    name: "Wilford Woodruff",
    description:
      "Werd in afdeling 118 geroepen als apostel. Moest in afdeling 136 met Orson Pratt een groep organiseren voor " +
      "de tocht naar het westen. Later president van de kerk.",
    gender: "man",
  },
  {
    slug: "lv-john-e-page",
    name: "John E. Page",
    description: "Werd in afdeling 118 geroepen als apostel, en in afdeling 124 genoemd als lid van de Twaalf.",
    gender: "man",
  },
  {
    slug: "lv-william-law",
    name: "William Law",
    description:
      "Werd in afdeling 124 aangewezen als raadgever van Joseph Smith, in de plaats van Hyrum Smith, en moest helpen " +
      "bij een plechtige proclamatie aan de koningen van de aarde.",
    gender: "man",
  },
  {
    slug: "lv-robert-b-thompson",
    name: "Robert B. Thompson",
    description: "Moest de profeet helpen bij het schrijven van een proclamatie aan de koningen van de aarde (afdeling 124).",
    gender: "man",
  },
  {
    slug: "lv-john-c-bennett",
    name: "John C. Bennett",
    description:
      "Moest de profeet bijstaan 'in het uur van beproeving'; zijn beloning zou niet uitblijven 'indien hij raad " +
      "aanneemt' (afdeling 124).",
    gender: "man",
  },
  {
    slug: "lv-george-miller",
    name: "George Miller",
    description:
      "In afdeling 124 zegt de Heer dat hij 'zonder bedrog' is en te vertrouwen. Moest meebouwen aan het Nauvoo " +
      "House, een gastenverblijf voor reizigers.",
    gender: "man",
  },
  {
    slug: "lv-vinson-knight",
    name: "Vinson Knight",
    description:
      "Werd in afdeling 124 genoemd om de bisschap te presideren en werd uitgenodigd aandelen te nemen in het " +
      "Nauvoo House.",
    gender: "man",
  },
  {
    slug: "lv-almon-babbitt",
    name: "Almon Babbitt",
    description:
      "In afdeling 124 wordt hij berispt omdat hij zijn eigen raad liet gelden boven die van het presidium van de kerk.",
    gender: "man",
  },

  // Hemelse boodschappers
  {
    slug: "lv-moroni",
    name: "Moroni",
    description:
      "De laatste geschiedschrijver van het Boek van Mormon. Verscheen als engel op 21 september 1823 aan Joseph " +
      "Smith en citeerde de profeet Maleachi (afdeling 2). In afdeling 27 zegt de Heer dat Hij Moroni zond om het " +
      "Boek van Mormon te openbaren.",
    gender: "man",
  },
  {
    slug: "lv-johannes-de-doper",
    name: "Johannes de Doper",
    description:
      "Ordende Joseph Smith en Oliver Cowdery op 15 mei 1829 tot het Aäronisch priesterschap (afdeling 13). Hij " +
      "handelde in opdracht van Petrus, Jakobus en Johannes (afdeling 27).",
    gender: "man",
  },
  {
    slug: "lv-petrus",
    name: "Petrus",
    description:
      "Apostel van Jezus Christus. Verscheen met Jakobus en Johannes bij de rivier de Susquehanna om Joseph Smith en " +
      "Oliver Cowdery tot apostel te ordenen en de sleutels van het koninkrijk over te dragen (afdelingen 27 en 128).",
    gender: "man",
  },
  {
    slug: "lv-jakobus",
    name: "Jakobus",
    description:
      "Apostel van Jezus Christus en broer van Johannes. Kwam samen met Petrus en Johannes om Joseph Smith en " +
      "Oliver Cowdery tot apostel te ordenen (afdeling 27).",
    gender: "man",
  },
  {
    slug: "lv-johannes",
    name: "Johannes (de apostel)",
    description:
      "De geliefde discipel. Afdeling 7 vertelt dat hij niet stierf maar mocht blijven tot de Heer terugkomt. Ordende " +
      "met Petrus en Jakobus Joseph Smith en Oliver Cowdery tot apostel (afdeling 27). Afdeling 77 legt delen van " +
      "zijn Openbaring uit.",
    gender: "man",
  },
  {
    slug: "lv-mozes",
    name: "Mozes",
    description:
      "Verscheen op 3 april 1836 in de tempel te Kirtland en droeg de sleutels over van de vergadering van Israël " +
      "(afdeling 110).",
    gender: "man",
  },
  {
    slug: "lv-elias",
    name: "Elias",
    description:
      "Verscheen in de tempel te Kirtland en droeg de bedeling van het evangelie van Abraham over (afdeling 110).",
    gender: "man",
  },
  {
    slug: "lv-elia",
    name: "Elia",
    description:
      "De profeet die naar de hemel werd opgenomen zonder de dood te smaken. Verscheen in de tempel te Kirtland met " +
      "de sleutels om het hart van de vaders tot de kinderen te wenden en dat van de kinderen tot de vaders " +
      "(afdelingen 2, 27 en 110).",
    gender: "man",
  },
  {
    slug: "lv-adam",
    name: "Adam (Michaël)",
    description:
      "De eerste mens, 'de vader van allen' en 'de oude van dagen', ook Michaël de aartsengel genoemd (afdelingen 27 " +
      "en 107). Gaf in de vallei Adam-ondi-Ahman zijn nageslacht zijn laatste zegen (afdeling 107); daar zal hij ook " +
      "zijn volk komen bezoeken (afdeling 116).",
    gender: "man",
  },
];
