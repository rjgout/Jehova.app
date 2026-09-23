import type { AlleskennerSeedItem } from "../src/lib/alleskenner/content";

// Inhoud voor De Alleskenner (zie docs/ALLESKENNER.md). Nieuwe onderdelen
// komen altijd via Claude Code: opgesteld uit prisma/bomContent.json, met per
// feit een bronvers en een letterlijk citaat, en goedgekeurd door de eigenaar.
// Controle: `npm run alleskenner:check`. ID's zijn vast: nooit hergebruiken of
// hernummeren, want "al gezien" wordt per ID bijgehouden.

export const alleskennerItems: AlleskennerSeedItem[] = [
  // --- 3-6-9 ---------------------------------------------------------------
  {
    id: "vraag-0001",
    kind: "QUESTION",
    data: {
      prompt: "Wie kreeg van de Heer de opdracht een schip te bouwen op de wijze die Hij zou tonen?",
      options: ["Nephi", "Laman", "Zoram", "Sam"],
      answer: "Nephi",
      evidence: [
        { ref: "1 Nephi 17:7", quote: "ik, Nephi, vele dagen in het land Overvloed was geweest" },
        { ref: "1 Nephi 17:8", quote: "Gij zult een schip bouwen op de wijze die Ik u zal tonen" },
      ],
    },
  },
  {
    id: "vraag-0002",
    kind: "QUESTION",
    data: {
      prompt: "Wat betekent de naam Liahona vertaald?",
      options: ["Kompas", "Licht", "Belofte", "Wegwijzer der vaderen"],
      answer: "Kompas",
      evidence: [{ ref: "Alma 37:38", quote: "de Liahona, hetgeen vertaald kompas betekent" }],
    },
  },
  {
    id: "vraag-0003",
    kind: "QUESTION",
    data: {
      prompt: "Waarom liet koning Benjamin een toren bouwen?",
      options: [
        "Zodat zijn volk zijn woorden kon horen",
        "Om de vijand te zien aankomen",
        "Om de platen in te bewaren",
        "Omdat de tempel was verwoest",
      ],
      answer: "Zodat zijn volk zijn woorden kon horen",
      evidence: [
        { ref: "Mosiah 2:7", quote: "liet hij een toren bouwen, opdat daardoor zijn volk de woorden kon horen" },
      ],
    },
  },
  {
    id: "vraag-0004",
    kind: "QUESTION",
    data: {
      prompt: "Hoe stierf de profeet Abinadi?",
      options: ["De vuurdood", "Door het zwaard", "Hij werd gestenigd", "Hij verdronk"],
      answer: "De vuurdood",
      evidence: [{ ref: "Mosiah 17:20", quote: "Abinadi deze woorden had gesproken, viel hij neer, daar hij de vuurdood was gestorven" }],
    },
  },
  {
    id: "vraag-0005",
    kind: "QUESTION",
    data: {
      prompt: "Hoeveel kleine stenen smolt de broeder van Jared uit een rots?",
      options: ["Zestien", "Twaalf", "Acht", "Vierentwintig"],
      answer: "Zestien",
      evidence: [{ ref: "Ether 3:1", quote: "uit een rots zestien kleine stenen smolt" }],
    },
  },
  {
    id: "vraag-0006",
    kind: "QUESTION",
    data: {
      prompt: "Hoe lang riep Enos de Heer aan in machtig gebed?",
      options: ["De gehele dag, en nog toen de avond viel", "Drie dagen en drie nachten", "Veertig dagen", "Eén nachtwake"],
      answer: "De gehele dag, en nog toen de avond viel",
      evidence: [
        { ref: "Enos 1:4", quote: "de gehele dag riep ik Hem aan; ja, en toen de avond viel, verhief ik mijn stem nog steeds" },
      ],
    },
  },
  {
    id: "vraag-0007",
    kind: "QUESTION",
    data: {
      prompt: "Wat overkwam Korihor nadat Alma tot hem had gesproken?",
      options: ["Hij werd met stomheid geslagen", "Hij werd blind", "Hij viel dood neer", "Hij werd verbannen uit Zarahemla"],
      answer: "Hij werd met stomheid geslagen",
      evidence: [{ ref: "Alma 30:50", quote: "werd Korihor met stomheid geslagen, zodat hij niet kon spreken" }],
    },
  },
  {
    id: "vraag-0008",
    kind: "QUESTION",
    data: {
      prompt: "Hoe noemde Moroni de staak met zijn verscheurde mantel?",
      options: ["Het vaandel der vrijheid", "De banier des Heren", "Het teken van Nephi", "De standaard van Zarahemla"],
      answer: "Het vaandel der vrijheid",
      evidence: [
        { ref: "Alma 46:11", quote: "Moroni, die de oppercommandant van de legers der Nephieten was" },
        { ref: "Alma 46:13", quote: "met aan het uiteinde zijn verscheurde mantel — en hij noemde die het vaandel der vrijheid" },
      ],
    },
  },
  {
    id: "vraag-0009",
    kind: "QUESTION",
    data: {
      prompt: "Waar stond Samuël de Lamaniet toen hij tot het volk van Zarahemla profeteerde?",
      options: ["Op de muur van de stad", "Op een toren", "In de tempel", "Op de heuvel Cumorah"],
      answer: "Op de muur van de stad",
      evidence: [
        { ref: "Helaman 13:2", quote: "een zekere Samuël, een Lamaniet, het land Zarahemla binnenkwam" },
        { ref: "Helaman 13:4", quote: "klom hij boven op de muur" },
      ],
    },
  },
  {
    id: "vraag-0010",
    kind: "QUESTION",
    data: {
      prompt: "Bij de tempel in welk land was de menigte bijeen toen de Heiland aan hen verscheen?",
      options: ["Het land Overvloed", "Het land Zarahemla", "Het land Nephi", "Het land Woestenij"],
      answer: "Het land Overvloed",
      evidence: [
        { ref: "3 Nephi 11:1", quote: "bijeenvergaderd rondom de tempel die in het land Overvloed stond" },
        { ref: "3 Nephi 11:8", quote: "zij zagen een Man uit de hemel neerdalen" },
      ],
    },
  },
  {
    id: "vraag-0011",
    kind: "QUESTION",
    data: {
      prompt: "Hoeveel jonge soldaten marcheerden er met Helaman mee?",
      options: ["Tweeduizend", "Tweehonderd", "Duizend", "Vijfhonderd"],
      answer: "Tweeduizend",
      evidence: [{ ref: "Alma 53:22", quote: "Helaman aan het hoofd van zijn tweeduizend jonge soldaten marcheerde" }],
    },
  },
  {
    id: "vraag-0012",
    kind: "QUESTION",
    data: {
      prompt: "In welke heuvel verborg Mormon de kronieken die hem waren toevertrouwd?",
      options: ["Cumorah", "Shelem", "Riplah", "Onidah"],
      answer: "Cumorah",
      evidence: [
        { ref: "Mormon 6:6", quote: "door de hand des Heren waren toevertrouwd, verborgen in de heuvel Cumorah" },
      ],
    },
  },
  {
    id: "vraag-0013",
    kind: "QUESTION",
    data: {
      prompt: "Wat stond er op de koperen platen die Laban bezat?",
      options: [
        "De kroniek der Joden en een geslachtsregister",
        "De wetten van koning Sedekia",
        "De profetieën van Samuël",
        "Een kaart van het beloofde land",
      ],
      answer: "De kroniek der Joden en een geslachtsregister",
      evidence: [
        { ref: "1 Nephi 3:3", quote: "Laban heeft de kroniek der Joden en ook een geslachtsregister van mijn voorvaderen" },
      ],
    },
  },
  {
    id: "vraag-0014",
    kind: "QUESTION",
    data: {
      prompt: "In welke wateren werden de mensen gedoopt die Alma volgden?",
      options: ["De wateren van Mormon", "Het water van Sebus", "De rivier Sidon", "De Rode Zee"],
      answer: "De wateren van Mormon",
      evidence: [
        { ref: "Mosiah 18:1", quote: "Alma, die voor de dienstknechten van koning Noach was gevlucht" },
        { ref: "Mosiah 18:16", quote: "zij werden gedoopt in de wateren van Mormon" },
      ],
    },
  },
  {
    id: "vraag-0015",
    kind: "QUESTION",
    data: {
      prompt: "Wie werd een dienstknecht van koning Lamoni en hoedde zijn kudden?",
      options: ["Ammon", "Aäron", "Amulek", "Alma"],
      answer: "Ammon",
      evidence: [
        { ref: "Alma 17:25", quote: "Derhalve werd Ammon een dienstknecht van koning Lamoni" },
      ],
    },
  },
  {
    id: "vraag-0016",
    kind: "QUESTION",
    data: {
      prompt: "Waarmee vergeleek Alma het woord toen hij tot de Zoramieten sprak?",
      options: ["Met een zaadje", "Met een lamp", "Met een rivier", "Met een zwaard"],
      answer: "Met een zaadje",
      evidence: [
        { ref: "Alma 31:1", quote: "Alma berichten ontving dat de Zoramieten de wegen des Heren verdraaiden" },
        { ref: "Alma 32:28", quote: "Nu zullen wij het woord vergelijken met een zaadje" },
      ],
    },
  },
  {
    id: "vraag-0017",
    kind: "QUESTION",
    data: {
      prompt: "Wat deden de bekeerde Lamanieten van Alma 24 met hun zwaarden?",
      options: ["Ze begroeven ze diep in de grond", "Ze smolten ze om", "Ze gaven ze aan de Nephieten", "Ze wierpen ze in de zee"],
      answer: "Ze begroeven ze diep in de grond",
      evidence: [{ ref: "Alma 24:17", quote: "zij hun zwaard namen, en alle wapens" }, { ref: "Alma 24:17", quote: "ze diep in de grond begroeven" }],
    },
  },
  {
    id: "vraag-0018",
    kind: "QUESTION",
    data: {
      prompt: "Hoeveel platen van zuiver goud werden er bij koning Limhi gebracht?",
      options: ["Vierentwintig", "Twaalf", "Zestien", "Acht"],
      answer: "Vierentwintig",
      evidence: [{ ref: "Mosiah 8:9", quote: "hebben zij vierentwintig platen meegebracht" }, { ref: "Mosiah 8:9", quote: "ze zijn van zuiver goud" }],
    },
  },
  {
    id: "vraag-0019",
    kind: "QUESTION",
    data: {
      prompt: "Wat bouwde Hagoth in de grensstreek van het land Overvloed?",
      options: ["Een buitengewoon groot schip", "Een toren", "Een tempel", "Een versterkte stad"],
      answer: "Een buitengewoon groot schip",
      evidence: [{ ref: "Alma 63:5", quote: "Hagoth, die een buitengewoon weetgierig man was, heenging en voor zichzelf een buitengewoon groot schip bouwde" }],
    },
  },
  // Luistervragen: het vers wordt voorgelezen, de naam van de spreker staat
  // bewust niet in het voorgelezen vers.
  {
    id: "vraag-0020",
    kind: "QUESTION",
    data: {
      prompt: "Luister: wie sprak deze woorden tot zijn volk?",
      options: ["Koning Benjamin", "Koning Mosiah", "Alma", "Koning Noach"],
      answer: "Koning Benjamin",
      listen: { ref: "Mosiah 2:17" },
      evidence: [
        { ref: "Mosiah 2:7", quote: "koning Benjamin hen niet allen binnen de muren van de tempel kon leren" },
        { ref: "Mosiah 2:17", quote: "wanneer gij in dienst van uw medemensen zijt, gij louter in dienst van uw God zijt" },
      ],
    },
  },
  {
    id: "vraag-0021",
    kind: "QUESTION",
    data: {
      prompt: "Luister: wie schreef deze belofte?",
      options: ["Moroni", "Mormon", "Nephi", "Ether"],
      answer: "Moroni",
      listen: { ref: "Moroni 10:4" },
      evidence: [
        { ref: "Moroni 10:1", quote: "Nu schrijf ik, Moroni, het een en ander" },
        { ref: "Moroni 10:4", quote: "zal Hij de waarheid ervan aan u openbaren door de macht van de Heilige Geest" },
      ],
    },
  },

  // --- Puzzel --------------------------------------------------------------
  {
    id: "puzzel-0001",
    kind: "PUZZLE",
    data: {
      groups: [
        {
          answer: "Liahona",
          accept: ["de liahona"],
          clues: ["Bal van zuiver koper", "Twee naalden", "Vertaald: kompas", "Werkte niet toen Nephi vastgebonden was"],
          evidence: [
            { ref: "1 Nephi 16:10", quote: "een ronde bal van vernuftige makelij" },
            { ref: "1 Nephi 16:10", quote: "In de bal bevonden zich twee naalden" },
            { ref: "Alma 37:38", quote: "de Liahona, hetgeen vertaald kompas betekent" },
            { ref: "1 Nephi 18:12", quote: "dat het kompas dat door de Heer was bereid, ophield te werken" },
          ],
        },
        {
          answer: "Toren",
          accept: ["torens", "de toren"],
          clues: ["Koning Benjamin liet er een bouwen", "Jared en zijn broeder kwamen er vandaan", "De taal werd er verward", "Gebouwd in de wijngaard"],
          evidence: [
            { ref: "Mosiah 2:7", quote: "daarom liet hij een toren bouwen" },
            { ref: "Ether 1:33", quote: "welke Jared, met zijn broeder en hun gezinnen" },
            { ref: "Omni 1:22", quote: "vanaf de toren in de tijd dat de Heer de taal van het volk had verward" },
            { ref: "2 Nephi 15:2", quote: "bouwde daarin een toren" },
          ],
        },
        {
          answer: "Schip",
          accept: ["schepen", "boot", "boten", "vaartuig", "vaartuigen"],
          clues: ["Nephi moest er een bouwen", "Hagoth bouwde een buitengewoon grote", "Zo licht als een vogel op het water", "De broeder van Jared had er acht"],
          evidence: [
            { ref: "1 Nephi 17:8", quote: "Gij zult een schip bouwen" },
            { ref: "Alma 63:5", quote: "een buitengewoon groot schip bouwde" },
            { ref: "Ether 2:16", quote: "zo licht als een vogel op het water" },
            { ref: "Ether 3:1", quote: "het aantal vaartuigen nu dat bereid was, was acht" },
          ],
        },
      ],
    },
  },
  {
    id: "puzzel-0002",
    kind: "PUZZLE",
    data: {
      groups: [
        {
          answer: "Muur",
          accept: ["muren", "de muur", "stadsmuur"],
          clues: ["Samuël de Lamaniet klom erop", "Aminadi legde het schrift erop uit", "Moroni klom er in het duister op", "Stenen en pijlen raakten hem er niet"],
          evidence: [
            { ref: "Helaman 13:4", quote: "klom hij boven op de muur" },
            { ref: "Alma 10:2", quote: "Aminadi die het schrift uitlegde dat zich op de muur van de tempel bevond" },
            { ref: "Alma 62:20", quote: "ging Moroni in het duister van de nacht uit en klom bovenop de muur" },
            { ref: "Helaman 16:2", quote: "zodat zij hem niet konden raken met hun stenen, noch met hun pijlen" },
          ],
        },
        {
          answer: "Zwaard",
          accept: ["zwaarden", "het zwaard"],
          clues: ["Gevest van zuiver goud", "Ammon sloeg er armen mee af", "Diep in de grond begraven", "Kling van het edelste staal"],
          evidence: [
            { ref: "1 Nephi 4:9", quote: "het gevest was van zuiver goud" },
            { ref: "Alma 17:37", quote: "sloeg hij de armen af met zijn zwaard" },
            { ref: "Alma 24:17", quote: "zij hun zwaard namen" },
            { ref: "1 Nephi 4:9", quote: "de kling van het zwaard van het edelste staal was" },
          ],
        },
        {
          answer: "Zaadje",
          accept: ["zaad", "zaadjes", "zaden"],
          clues: ["Alma vergeleek het woord ermee", "Gaat zwellen in je boezem", "Niet uitwerpen door ongeloof", "Verruimt je ziel"],
          evidence: [
            { ref: "Alma 32:28", quote: "het woord vergelijken met een zaadje" },
            { ref: "Alma 32:28", quote: "in uw boezem gaan zwellen" },
            { ref: "Alma 32:28", quote: "indien gij het niet uitwerpt door uw ongeloof" },
            { ref: "Alma 32:28", quote: "het begint mijn ziel te verruimen" },
          ],
        },
      ],
    },
  },
  {
    id: "puzzel-0003",
    kind: "PUZZLE",
    data: {
      groups: [
        {
          answer: "Platen",
          accept: ["plaat", "de platen"],
          clues: ["Laban had ze van koper", "Vierentwintig van zuiver goud", "Het volk van Mosiah bracht ze mee naar Zarahemla", "Mormon schreef aan de hand van die van Nephi"],
          evidence: [
            { ref: "1 Nephi 3:3", quote: "ze zijn op platen van koper gegraveerd" },
            { ref: "Mosiah 8:9", quote: "hebben zij vierentwintig platen meegebracht" },
            { ref: "Omni 1:14", quote: "het volk van Mosiah had gezonden met de platen van koper" },
            { ref: "Mormon 6:6", quote: "heb ik deze kroniek geschreven aan de hand van de platen van Nephi" },
          ],
        },
        {
          answer: "Stenen",
          accept: ["steen", "de stenen"],
          clues: ["De broeder van Jared smolt er zestien", "Gazelem kreeg er een die in de duisternis schijnt", "Naar Samuël op de muur geworpen", "Wit en helder als doorschijnend glas"],
          evidence: [
            { ref: "Ether 3:1", quote: "zestien kleine stenen smolt" },
            { ref: "Alma 37:23", quote: "Ik zal voor mijn dienstknecht Gazelem een steen bereiden, die in de duisternis zal schijnen" },
            { ref: "Helaman 16:2", quote: "zij wierpen stenen naar hem op de muur" },
            { ref: "Ether 3:1", quote: "zij waren wit en helder, ja, zoals doorschijnend glas" },
          ],
        },
        {
          answer: "Dopen",
          accept: ["doop", "gedoopt", "doopsel", "de doop"],
          clues: ["De wateren van Mormon", "Getuigenis van een verbond", "Ongeveer tweehonderdvier zielen", "In de naam des Heren"],
          evidence: [
            { ref: "Mosiah 18:16", quote: "zij werden gedoopt in de wateren van Mormon" },
            { ref: "Mosiah 18:10", quote: "als getuigenis voor Hem dat gij een verbond met Hem hebt aangegaan" },
            { ref: "Mosiah 18:16", quote: "zij waren in aantal ongeveer tweehonderdvier zielen" },
            { ref: "Mosiah 18:10", quote: "in de naam des Heren te worden gedoopt" },
          ],
        },
      ],
    },
  },

  // --- Onderwerpen (Open Deur gebruikt de eerste 4, de Finale alle 5) -------
  {
    id: "onderwerp-0001",
    kind: "TOPIC",
    data: {
      subject: "Nephi",
      answers: [
        { text: "Zoon van Lehi", accept: ["lehi", "vader lehi"], evidence: { ref: "1 Nephi 1:5", quote: "mijn vader Lehi" } },
        { text: "Moest een schip bouwen", accept: ["schip", "bouwde een schip"], evidence: { ref: "1 Nephi 17:8", quote: "Gij zult een schip bouwen" } },
        { text: "Brak zijn stalen boog", accept: ["boog", "gebroken boog"], evidence: { ref: "1 Nephi 16:18", quote: "mijn boog, die van zuiver staal was gemaakt, brak" } },
        { text: "Broer van Laman, Lemuël en Sam", accept: ["laman", "lemuel", "sam", "broers"], evidence: { ref: "1 Nephi 2:5", quote: "mijn oudere broeders, namelijk Laman, Lemuël en Sam" } },
        { text: "Zei: Ik zal heengaan en doen wat de Heer gebiedt", accept: ["ik zal heengaan en doen", "heengaan en doen"], evidence: { ref: "1 Nephi 3:7", quote: "Ik zal heengaan en de dingen doen die de Heer heeft geboden" } },
      ],
      distractors: [
        "Stierf de vuurdood",
        "Werd met stomheid geslagen",
        "Scheurde zijn mantel",
        "Liet een toren bouwen",
        "Klom op de muur van Zarahemla",
        "Smolt zestien stenen",
        "Hoedde de kudden van Lamoni",
        "Bouwde een schip in de grensstreek van Overvloed",
      ],
    },
  },
  {
    id: "onderwerp-0002",
    kind: "TOPIC",
    data: {
      subject: "Ammon, de zoon van Mosiah",
      answers: [
        { text: "Zoon van koning Mosiah", accept: ["mosiah", "zoon van mosiah"], evidence: { ref: "Mosiah 27:34", quote: "hun namen waren Ammon, en Aäron, en Omner, en Himni; dat waren de namen van de zonen van Mosiah" } },
        { text: "Broer van Aäron", accept: ["aaron", "broer van aaron"], evidence: { ref: "Mosiah 27:34", quote: "Ammon, en Aäron, en Omner, en Himni" } },
        { text: "Werd dienstknecht van koning Lamoni", accept: ["dienstknecht", "lamoni"], evidence: { ref: "Alma 17:25", quote: "werd Ammon een dienstknecht van koning Lamoni" } },
        { text: "Hoedde de kudden van Lamoni", accept: ["kudden", "schapen hoeden", "kudde"], evidence: { ref: "Alma 17:25", quote: "om de kudden van Lamoni te hoeden" } },
        { text: "Sloeg met zijn zwaard armen af", accept: ["armen af", "armen afslaan", "zwaard"], evidence: { ref: "Alma 17:37", quote: "sloeg hij de armen af met zijn zwaard" } },
      ],
      distractors: [
        "Zoon van Lehi",
        "Brak zijn stalen boog",
        "Stond op de muur van Zarahemla",
        "Liet een toren bouwen",
        "Werd met stomheid geslagen",
        "Leidde tweeduizend jonge soldaten",
        "Verborg de platen in Cumorah",
        "Bad de gehele dag in het woud",
      ],
    },
  },
  {
    id: "onderwerp-0003",
    kind: "TOPIC",
    data: {
      subject: "Moroni, de oppercommandant",
      answers: [
        { text: "Oppercommandant van de Nephitische legers", accept: ["opperbevelhebber", "legeraanvoerder", "commandant"], evidence: { ref: "Alma 46:11", quote: "Moroni, die de oppercommandant van de legers der Nephieten was" } },
        { text: "Was vertoornd op Amalickiah", accept: ["amalickiah"], evidence: { ref: "Alma 46:11", quote: "dat hij vertoornd was op Amalickiah" } },
        { text: "Scheurde zijn mantel", accept: ["mantel", "gescheurde mantel"], evidence: { ref: "Alma 46:12", quote: "hij zijn mantel scheurde" } },
        { text: "Het vaandel der vrijheid", accept: ["vaandel", "vaandel der vrijheid", "vrijheid"], evidence: { ref: "Alma 46:13", quote: "hij noemde die het vaandel der vrijheid" } },
        { text: "Klom 's nachts op de muur", accept: ["muur", "op de muur"], evidence: { ref: "Alma 62:20", quote: "ging Moroni in het duister van de nacht uit en klom bovenop de muur" } },
      ],
      distractors: [
        "Schreef de belofte van Moroni 10:4",
        "Verborg de platen in Cumorah",
        "Liet een toren bouwen",
        "Zoon van Lehi",
        "Stierf de vuurdood",
        "Werd dienstknecht van koning Lamoni",
        "Bouwde een buitengewoon groot schip",
        "Werd met stomheid geslagen",
      ],
    },
  },
  {
    id: "onderwerp-0004",
    kind: "TOPIC",
    data: {
      subject: "Koning Benjamin",
      answers: [
        { text: "Liet een toren bouwen", accept: ["toren"], evidence: { ref: "Mosiah 2:7", quote: "liet hij een toren bouwen" } },
        { text: "Werkte met zijn eigen handen", accept: ["eigen handen", "handen"], evidence: { ref: "Mosiah 2:14", quote: "ik heb zelfs met mijn eigen handen gewerkt om u te kunnen dienen" } },
        { text: "In dienst van je medemensen ben je in dienst van God", accept: ["medemensen", "dienst van god"], evidence: { ref: "Mosiah 2:17", quote: "wanneer gij in dienst van uw medemensen zijt, gij louter in dienst van uw God zijt" } },
        { text: "De natuurlijke mens is een vijand van God", accept: ["natuurlijke mens"], evidence: { ref: "Mosiah 3:19", quote: "de natuurlijke mens is een vijand van God" } },
        { text: "Zijn zoon heette Mosiah", accept: ["mosiah", "vader van mosiah"], evidence: { ref: "Mosiah 1:10", quote: "liet hij Mosiah bij zich brengen" } },
      ],
      distractors: [
        "Stierf de vuurdood",
        "Scheurde zijn mantel",
        "Hoedde de kudden van Lamoni",
        "Doopte in de wateren van Mormon",
        "Vergeleek het woord met een zaadje",
        "Brak zijn stalen boog",
        "Klom op de muur van de stad",
        "Smolt zestien stenen",
      ],
    },
  },
  {
    id: "onderwerp-0005",
    kind: "TOPIC",
    data: {
      subject: "Alma, de zoon van Alma",
      answers: [
        { text: "Zoon van Alma", accept: ["alma de oudere", "vader alma"], evidence: { ref: "Mosiah 27:14", quote: "zijn dienstknecht Alma, die uw vader is" } },
        { text: "Een engel verscheen aan hem", accept: ["engel"], evidence: { ref: "Mosiah 27:11", quote: "verscheen hun de engel des Heren" } },
        { text: "Korihor werd met stomheid geslagen", accept: ["korihor", "stomheid"], evidence: { ref: "Alma 30:50", quote: "werd Korihor met stomheid geslagen" } },
        { text: "Vergeleek het woord met een zaadje", accept: ["zaadje", "zaad"], evidence: { ref: "Alma 32:28", quote: "het woord vergelijken met een zaadje" } },
        { text: "Werd samen met Amulek aangeklaagd door Zeëzrom", accept: ["zeezrom", "amulek"], evidence: { ref: "Alma 10:31", quote: "Zeëzrom was. Nu was hij de belangrijkste die Amulek en Alma aanklaagde" } },
      ],
      distractors: [
        "Liet een toren bouwen",
        "Sloeg met zijn zwaard armen af",
        "Stierf de vuurdood",
        "Leidde tweeduizend jonge soldaten",
        "Brak zijn stalen boog",
        "Scheurde zijn mantel",
        "Verborg de platen in Cumorah",
        "Zoon van koning Mosiah",
      ],
    },
  },
];
