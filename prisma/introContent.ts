// Content voor de introductiecursus "Ontdek het Boek van Mormon" — zie
// prisma/importIntro.ts voor hoe dit wordt ingeladen, en CLAUDE.md voor de
// afspraak dat aanpassen hier + "content opnieuw laden" de manier is om de
// tekst te wijzigen (net als prisma/podcastContent.ts/kidsManifest.json).
//
// Elke les is een reeks content-blokken (uitleg/interactie, zie IntroBlock
// hieronder) gevolgd door een paar gegradeerde oefeningen (IntroExerciseSeed,
// hergebruikt dezelfde ExerciseType's als de rest van de app — geen nieuw
// oefeningtype nodig). Blokken die naar echte tekst/personen/boeken
// verwijzen (scripture/personTree/bookList) doen dat altijd via een
// slug/nummer-verwijzing naar bestaande Verse/Person/Book-rijen, nooit met
// zelf gekopieerde tekst — zie de toelichting bij IntroLesson in
// schema.prisma.

export type IntroBlock =
  | { type: "text"; body: string }
  // Ongegradeerd, puur voor betrokkenheid — wordt nergens opgeslagen.
  | { type: "poll"; question: string; options: string[] }
  // Ongegradeerd open nadenkmoment, geen vast "goed" antwoord.
  | { type: "reflection"; question: string; prompts?: string[] }
  // Tijdlijn/route-overzicht (uitleg, niet gegradeerd — de gegradeerde
  // volgorde-check zit apart in exercises, als SEQUENCE-oefening).
  | { type: "steps"; title?: string; steps: { label: string; description?: string }[] }
  // Familie-/personenkaart — leest de echte Person-tabel (prisma/introPersons.ts).
  | { type: "personTree"; intro?: string; personSlugs: string[] }
  // "Boekenkast" — leest de echte Book-tabel (bookSlug moet een bestaande
  // Book.slug zijn, zie prisma/bomContent.json).
  | { type: "bookList"; intro?: string; bookSlugs: string[] }
  // Toont een echt fragment — leest live uit de Verse-tabel, nooit
  // gekopieerde tekst hier in dit bestand.
  | { type: "scripture"; bookSlug: string; chapterNumber: number; verseNumbers?: number[]; label?: string }
  // Bewust GEEN los "readMore { href }"-blok met een handmatig ingevulde
  // link meer: die verwees ooit naar /courses/per-boek, dat een admin via
  // /adminbackend kan uitschakelen (Course.enabled) — met alle
  // per-boek-cursussen uit staat toont die pagina dan gewoon niets, dus de
  // link "werkte" technisch wel maar leidde nergens meer heen. Elke link
  // naar echte content hoort daarom altijd dynamisch opgelost te worden
  // (zie chapterLink hieronder), nooit als vaste href hier vastgelegd.
  //
  // Diepe link naar een echt hoofdstuk in de lezer — leest live het bestaande
  // Chapter-id op (nooit een hardcoded /lesson/<id>, want dat id verschilt
  // per omgeving), net als het scripture-blok hierboven nooit gekopieerde
  // tekst gebruikt.
  | { type: "chapterLink"; bookSlug: string; chapterNumber: number; label: string }
  // Vast eindscherm met de 3 keuzes — alleen gebruikt als laatste blok van de
  // laatste les (zie IntroLessonFlow.tsx: dit blok wordt uit de content-
  // blokken gelicht en na de eindtoets getoond, in plaats van de
  // standaard "Verder →"-link).
  | { type: "finalChoices" };

export interface IntroExerciseOptionSeed {
  label: string;
  isCorrect: boolean;
}

export interface IntroExerciseSeed {
  type: "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SEQUENCE";
  prompt: string;
  answers: string[];
  wordBank?: string[];
  options?: IntroExerciseOptionSeed[];
}

export interface IntroLessonSeed {
  number: number;
  slug: string;
  title: string;
  summary: string;
  blocks: IntroBlock[];
  exercises: IntroExerciseSeed[];
}

export const introLessons: IntroLessonSeed[] = [
  {
    number: 1,
    slug: "wat-is-het-boek-van-mormon",
    title: "Wat is het Boek van Mormon?",
    summary: "Een eerste kennismaking — geen voorkennis nodig.",
    blocks: [
      {
        type: "poll",
        question: "Heb je het Boek van Mormon al eens gelezen?",
        options: ["Nog nooit", "Een paar stukjes", "Ik heb het al eens gelezen", "Ik weet het eigenlijk niet meer"],
      },
      {
        type: "text",
        body:
          "Welkom! Je hoeft helemaal niets te weten om deze cursus te beginnen — dat is precies waar hij voor is. " +
          "In ongeveer 12 korte lessen ontdek je wat het Boek van Mormon is, wie erin voorkomen, en waar het over gaat.",
      },
      {
        type: "text",
        body:
          "Het Boek van Mormon is een boek met geschiedenissen en geloofsverhalen, opgeschreven door verschillende " +
          "mensen over een periode van ruim duizend jaar. Het heet zo omdat het grootste deel is samengevat en " +
          "bewerkt door iemand die Mormon heette — hij bracht de verslagen van eerdere schrijvers samen tot één boek.",
      },
      {
        type: "personTree",
        intro: "Twee namen kom je in deze cursus vaak tegen — al spelen ze pas heel laat in het verhaal een rol:",
        personSlugs: ["mormon", "moroni"],
      },
      {
        type: "text",
        body:
          "Moroni was de zoon van Mormon. Hij maakte het boek af nadat zijn vader was overleden, en voegde er zelf " +
          "ook nog een deel aan toe.",
      },
      {
        type: "text",
        body:
          "Volgens de kerk is het Boek van Mormon bedoeld als een tweede getuige naast de Bijbel — beide boeken " +
          "vertellen, ieder op hun eigen plek in de geschiedenis, over Jezus Christus.",
      },
    ],
    exercises: [
      {
        type: "FILL_BLANK",
        prompt: "Het Boek van Mormon is volgens de kerk een tweede getuige van ______.",
        answers: ["jezus christus"],
        options: [
          { label: "Jezus Christus", isCorrect: true },
          { label: "Mormon", isCorrect: false },
          { label: "de profeten", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie bracht de verslagen van eerdere schrijvers samen tot het Boek van Mormon?",
        answers: ["Mormon"],
        options: [
          { label: "Mormon", isCorrect: true },
          { label: "Moroni", isCorrect: false },
          { label: "Nephi", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Moroni was de vader van Mormon.",
        answers: ["false"],
      },
    ],
  },
  {
    number: 2,
    slug: "het-verhaal-in-5-minuten",
    title: "Het verhaal in 5 minuten",
    summary: "Het grote plaatje, zonder details.",
    blocks: [
      {
        type: "text",
        body:
          "Voordat we in details duiken, eerst het hele verhaal in vogelvlucht — zodat je straks elk stukje ergens " +
          "kan plaatsen.",
      },
      {
        type: "steps",
        title: "Het grote verhaal",
        steps: [
          { label: "Jeruzalem", description: "Een familie krijgt de opdracht te vertrekken." },
          { label: "Wildernis", description: "Jarenlang reizen door de woestijn." },
          { label: "Nieuw land", description: "Met de boot naar een onbekend werelddeel." },
          { label: "Generaties", description: "Nakomelingen groeien uit tot volken." },
          { label: "Conflicten", description: "Perioden van vrede én van oorlog." },
          { label: "Jezus Christus", description: "Hij verschijnt persoonlijk aan het volk." },
          { label: "Verval", description: "Uiteindelijk verdwijnt de vrede weer." },
          { label: "Mormon en Moroni", description: "Zij schrijven de laatste bladzijden en verbergen het boek." },
        ],
      },
      {
        type: "text",
        body:
          "Dat is het. Je hoeft dit rijtje nog niet uit je hoofd te kennen — in de volgende lessen komt elk stukje " +
          "apart nog een keer terug.",
      },
    ],
    exercises: [
      {
        type: "SEQUENCE",
        prompt: "Zet de gebeurtenissen in de juiste volgorde.",
        answers: ["Jeruzalem", "Wildernis", "Nieuw land", "Jezus Christus verschijnt", "Mormon en Moroni"],
        wordBank: ["Jeruzalem", "Wildernis", "Nieuw land", "Jezus Christus verschijnt", "Mormon en Moroni"],
      },
    ],
  },
  {
    number: 3,
    slug: "wie-is-wie",
    title: "Wie is wie?",
    summary: "Maak kennis met de familie van Lehi.",
    blocks: [
      {
        type: "text",
        body: "Het verhaal begint bij één gezin: Lehi en Sariah, en hun kinderen.",
      },
      {
        type: "personTree",
        intro: "De familie van Lehi:",
        personSlugs: ["lehi", "sariah", "laman", "lemuel", "sam", "nephi"],
      },
      {
        type: "text",
        body:
          "Later in het verhaal komen er nog twee zonen bij: Jakob en Jozef. En helemaal aan het einde van het " +
          "boek — meer dan 900 jaar later — spelen Mormon en Moroni hun rol.",
      },
      {
        type: "reflection",
        question: "Vier broers, vier verschillende karakters. Wat verwacht je dat er gebeurt als ze het niet eens zijn?",
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie is Nephi van Lehi?",
        answers: ["Zijn zoon"],
        options: [
          { label: "Zijn zoon", isCorrect: true },
          { label: "Zijn broer", isCorrect: false },
          { label: "Zijn vader", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie is Sariah?",
        answers: ["Lehi's vrouw"],
        options: [
          { label: "Lehi's vrouw", isCorrect: true },
          { label: "Lehi's dochter", isCorrect: false },
          { label: "Nephi's vrouw", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Laman en Lemuel zijn de broers van Nephi.",
        answers: ["true"],
      },
    ],
  },
  {
    number: 4,
    slug: "van-jeruzalem-naar-een-nieuw-land",
    title: "Van Jeruzalem naar een nieuw land",
    summary: "Het vertrek van Lehi's familie.",
    blocks: [
      {
        type: "text",
        body:
          "Lehi kreeg de waarschuwing dat Jeruzalem zou vallen, en de opdracht om met zijn gezin de stad te " +
          "verlaten — vóórdat dat gebeurde.",
      },
      {
        type: "steps",
        title: "De route",
        steps: [
          { label: "Jeruzalem", description: "Lehi waarschuwt de stad, en vertrekt dan zelf." },
          { label: "Wildernis", description: "Jarenlang op reis, met tussenstops om voedsel en platen te halen." },
          { label: "Zee", description: "Nephi bouwt, met hulp van God, een schip." },
          { label: "Nieuw land", description: "Na een lange overtocht bereiken ze een nieuw werelddeel." },
        ],
      },
      {
        type: "text",
        body:
          "Onderweg haalden Nephi en zijn broers ook de koperen platen op — kostbare platen met daarop de " +
          "geschiedenis en geloofsleer van hun volk tot dan toe.",
      },
      {
        type: "chapterLink",
        bookSlug: "1-nephi",
        chapterNumber: 1,
        label: "Lees zelf hoe dit verhaal begint",
      },
    ],
    exercises: [
      {
        type: "SEQUENCE",
        prompt: "Zet de reis in de juiste volgorde.",
        answers: ["Jeruzalem", "Wildernis", "Zee", "Nieuw land"],
        wordBank: ["Jeruzalem", "Wildernis", "Zee", "Nieuw land"],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat haalden Nephi en zijn broers onderweg op?",
        answers: ["De koperen platen"],
        options: [
          { label: "De koperen platen", isCorrect: true },
          { label: "Een schip", isCorrect: false },
          { label: "Een leger", isCorrect: false },
        ],
      },
    ],
  },
  {
    number: 5,
    slug: "hoe-zit-het-boek-in-elkaar",
    title: "Hoe zit het boek in elkaar?",
    summary: "Een boek van meerdere schrijvers, samengebracht door Mormon.",
    blocks: [
      {
        type: "text",
        body:
          "Het Boek van Mormon is niet door één persoon in één keer geschreven — het bestaat uit meerdere kleinere " +
          "boeken, elk met een eigen schrijver, die achter elkaar zijn gebundeld.",
      },
      {
        type: "bookList",
        intro: "Dit zijn de boeken, in de volgorde waarin ze in het Boek van Mormon staan:",
        bookSlugs: [
          "1-nephi",
          "2-nephi",
          "jakob",
          "enos",
          "jarom",
          "omni",
          "woorden-van-mormon",
          "mosiah",
          "alma",
          "helaman",
          "3-nephi",
          "4-nephi",
          "mormon",
          "ether",
          "moroni",
        ],
      },
      {
        type: "personTree",
        intro: "Mormon speelde daarbij een bijzondere rol:",
        personSlugs: ["mormon"],
      },
      {
        type: "text",
        body:
          "Mormon las de verslagen van al die eerdere schrijvers, en bracht ze samen tot één, korter boek — met " +
          "zijn eigen naam erop. Zijn zoon Moroni voegde er na hem nog het laatste stuk aan toe.",
      },
      {
        type: "reflection",
        question: "Je hoeft deze lijst nog niet uit je hoofd te kennen. Wat valt je op aan zo'n lange rij schrijvers?",
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie bracht de boeken van eerdere schrijvers samen tot het Boek van Mormon?",
        answers: ["Mormon"],
        options: [
          { label: "Mormon", isCorrect: true },
          { label: "Nephi", isCorrect: false },
          { label: "Lehi", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Het Boek van Mormon is door één en dezelfde persoon geschreven.",
        answers: ["false"],
      },
      {
        type: "SEQUENCE",
        prompt: "Zet deze vier boeken in de juiste volgorde.",
        answers: ["1 Nephi", "2 Nephi", "Jakob", "Enos"],
        wordBank: ["1 Nephi", "2 Nephi", "Jakob", "Enos"],
      },
    ],
  },
  {
    number: 6,
    slug: "waarom-staat-jezus-christus-centraal",
    title: "Waarom staat Jezus Christus centraal?",
    summary: "Het Boek van Mormon draait steeds weer om Hem.",
    blocks: [
      {
        type: "text",
        body:
          "Op de titelpagina noemt het Boek van Mormon zichzelf bedoeld om mensen te overtuigen dat Jezus Christus " +
          "de Christus is. Dat thema komt telkens terug — niet in één apart hoofdstuk, maar door het hele boek heen.",
      },
      {
        type: "text",
        body:
          "Een paar woorden die je vaak zal tegenkomen: geloof, bekering, hoop, en opstanding. Je hoeft ze nu nog " +
          "niet allemaal scherp te kunnen uitleggen — ze komen vanzelf terug tijdens het lezen.",
      },
      {
        type: "reflection",
        question: "Wat verwacht je van een boek dat zegt dat het vooral over Jezus Christus gaat?",
      },
      {
        type: "text",
        body: "Als je het Boek van Mormon gaat lezen, zul je Jezus Christus steeds opnieuw tegenkomen.",
      },
    ],
    exercises: [
      {
        type: "FILL_BLANK",
        prompt: "Het Boek van Mormon draait steeds weer om ______.",
        answers: ["jezus christus"],
        options: [
          { label: "Jezus Christus", isCorrect: true },
          { label: "Mormon", isCorrect: false },
          { label: "de geschiedenis van oorlogen", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Welk van deze woorden hoort NIET bij de thema's die vaak terugkomen?",
        answers: ["belastingen"],
        options: [
          { label: "geloof", isCorrect: false },
          { label: "bekering", isCorrect: false },
          { label: "belastingen", isCorrect: true },
          { label: "hoop", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Jezus Christus wordt pas helemaal aan het einde van het Boek van Mormon voor het eerst genoemd.",
        answers: ["false"],
      },
    ],
  },
  {
    number: 7,
    slug: "profeten-openbaring-en-god",
    title: "Profeten, openbaring en God",
    summary: "Wat doet een profeet eigenlijk?",
    blocks: [
      {
        type: "text",
        body:
          "In het Boek van Mormon is een profeet iemand die een boodschap van God ontvangt — dat heet openbaring " +
          "— en die vervolgens aan anderen doorgeeft. Niet iedereen luistert, en niet iedereen reageert hetzelfde.",
      },
      {
        type: "steps",
        title: "Een terugkerend patroon",
        steps: [
          { label: "God", description: "Heeft een boodschap voor zijn volk." },
          { label: "Openbaring", description: "Die boodschap komt bij een profeet terecht." },
          { label: "Profeet", description: "Geeft de boodschap door aan het volk." },
          { label: "Boodschap", description: "Vaak een oproep tot verandering of een waarschuwing." },
          { label: "Reactie", description: "Sommigen luisteren, anderen niet." },
        ],
      },
      {
        type: "personTree",
        intro: "Een paar profeten die je in het Boek van Mormon tegenkomt, verspreid over een lange periode:",
        personSlugs: ["lehi", "nephi", "alma", "samuel-de-lamaniet", "mormon", "moroni"],
      },
    ],
    exercises: [
      {
        type: "SEQUENCE",
        prompt: "Zet dit terugkerende patroon in de juiste volgorde.",
        answers: ["God", "Openbaring", "Profeet", "Boodschap", "Reactie"],
        wordBank: ["God", "Openbaring", "Profeet", "Boodschap", "Reactie"],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat is, volgens deze les, een profeet in het Boek van Mormon?",
        answers: ["Iemand die een boodschap van God ontvangt en doorgeeft"],
        options: [
          { label: "Iemand die een boodschap van God ontvangt en doorgeeft", isCorrect: true },
          { label: "Iemand die de toekomst exact kan voorspellen", isCorrect: false },
          { label: "Een koning die het volk regeert", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Een profeet spreekt in het Boek van Mormon zijn eigen mening uit, nooit een boodschap namens God.",
        answers: ["false"],
      },
    ],
  },
  {
    number: 8,
    slug: "keuzes-goed-en-kwaad",
    title: "Keuzes, goed en kwaad",
    summary: "Waarom mensen doen wat ze doen.",
    blocks: [
      {
        type: "text",
        body:
          "Het is verleidelijk om te denken: Nephi is de goede, Laman en Lemuel zijn de slechten. Maar het verhaal " +
          "laat vooral mensen zien die verschillende keuzes maken, en verschillend reageren op God, op moeilijke " +
          "omstandigheden, en op elkaar.",
      },
      {
        type: "reflection",
        question:
          "Stel: een vriend vraagt je mee te doen aan iets dat niet eerlijk voelt. Wat zou meespelen in jouw keuze?",
      },
      {
        type: "steps",
        title: "Een patroon dat vaak terugkomt",
        steps: [
          { label: "Keuzevrijheid", description: "Iedereen mag zelf kiezen hoe te reageren." },
          { label: "Keuzes", description: "Verschillende mensen kiezen verschillend, in dezelfde situatie." },
          { label: "Gevolgen", description: "Elke keuze heeft een uitwerking — op jezelf en op anderen." },
          { label: "Verandering", description: "Mensen kunnen, soms drastisch, van koers veranderen." },
        ],
      },
      {
        type: "text",
        body:
          "Laman en Lemuel klaagden bijvoorbeeld herhaaldelijk tegen hun vader Lehi, terwijl Nephi in dezelfde " +
          "situaties bleef vertrouwen. Dat verschil in reactie, niet alleen een simpel \"goed\" of \"slecht\" label, " +
          "is waar het verhaal steeds weer op terugkomt.",
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat betekent keuzevrijheid het beste?",
        answers: ["De vrijheid om zelf te kiezen hoe je reageert"],
        options: [
          { label: "De vrijheid om zelf te kiezen hoe je reageert", isCorrect: true },
          { label: "Altijd precies doen wat je ouders zeggen", isCorrect: false },
          { label: "Nooit de gevolgen van je keuzes dragen", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie klaagden herhaaldelijk tegen hun vader Lehi?",
        answers: ["Laman en Lemuel"],
        options: [
          { label: "Laman en Lemuel", isCorrect: true },
          { label: "Nephi en Sam", isCorrect: false },
          { label: "Jakob en Jozef", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "In het Boek van Mormon verandert niemand ooit van gedrag of overtuiging.",
        answers: ["false"],
      },
    ],
  },
  {
    number: 9,
    slug: "jezus-christus-verschijnt",
    title: "Jezus Christus verschijnt",
    summary: "Het hoogtepunt van het boek.",
    blocks: [
      {
        type: "text",
        body:
          "Ergens halverwege het boek gebeurt het meest bijzondere moment van het hele verhaal: Jezus Christus " +
          "verschijnt zelf aan het volk, kort na zijn opstanding in Jeruzalem.",
      },
      {
        type: "text",
        body:
          "Een grote menigte was bijeen rond de tempel. Ze hoorden een stem uit de hemel — geen harde stem, maar " +
          "een zachte die toch door hen heen leek te gaan. Pas de derde keer verstonden ze wat er werd gezegd.",
      },
      {
        type: "scripture",
        bookSlug: "3-nephi",
        chapterNumber: 11,
        verseNumbers: [8, 9, 10, 11],
        label: "3 Nephi 11:8-11",
      },
      {
        type: "text",
        body:
          "Daarna liet Hij de mensen, één voor één, de tekens van de nagels in zijn handen en voeten voelen — zodat " +
          "ze niet alleen hoorden, maar ook zelf konden vaststellen dat het echt Hem was.",
      },
      {
        type: "reflection",
        question: "Wat zou jij denken of voelen als je daar zelf bij had gestaan?",
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat zei de stem uit de hemel over de Man die uit de hemel neerdaalde?",
        answers: ["Dat het zijn geliefde Zoon was"],
        options: [
          { label: "Dat het zijn geliefde Zoon was", isCorrect: true },
          { label: "Dat het een engel was", isCorrect: false },
          { label: "Dat het Mormon was", isCorrect: false },
        ],
      },
      {
        type: "FILL_BLANK",
        prompt: "Ik ben ______, die volgens het getuigenis der profeten in de wereld zou komen.",
        answers: ["jezus christus"],
        options: [
          { label: "Jezus Christus", isCorrect: true },
          { label: "een engel", isCorrect: false },
          { label: "Mormon", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "De menigte mocht de tekens van de nagels in zijn handen en voeten voelen.",
        answers: ["true"],
      },
    ],
  },
  {
    number: 10,
    slug: "hoe-lees-je-het-boek-van-mormon",
    title: "Hoe lees je het Boek van Mormon?",
    summary: "Praktische tips om zelf te beginnen.",
    blocks: [
      {
        type: "text",
        body:
          "Je hebt nu het grote plaatje gezien: de belangrijkste mensen, hoe het boek is opgebouwd, en waar het " +
          "steeds weer om draait. Deze les gaat over iets praktisch: hoe begin je zelf met lezen?",
      },
      {
        type: "steps",
        title: "Een paar tips om te beginnen",
        steps: [
          { label: "Begin bij het begin", description: "1 Nephi 1 is een prima startpunt — je maakt meteen kennis met Nephi." },
          { label: "Een klein stukje per keer", description: "Een paar verzen per dag is al genoeg; het hoeft niet in één keer uit." },
          { label: "Het is oké om iets niet meteen te snappen", description: "Sommige stukken lees je later nog eens, met nieuwe ogen." },
          { label: "Let op namen en plaatsen", description: "Een overzicht van wie wie is erbij houden helpt — zoals in de vorige lessen." },
        ],
      },
      {
        type: "text",
        body:
          "In deze app staat elk hoofdstuk klaar om te lezen, met korte oefeningen erbij om te checken of iets is " +
          "blijven hangen. Je hoeft niets te onthouden voordat je begint.",
      },
      {
        type: "text",
        body:
          "Wil je liever eerst lezen over het moment waarop Jezus Christus zelf aan de mensen in het Boek van Mormon " +
          "verschijnt? Lees dan 3 Nephi 11. Dit is een bijzonder hoofdstuk om te lezen na wat je in deze cursus over " +
          "Jezus Christus hebt geleerd.",
      },
      {
        type: "chapterLink",
        bookSlug: "3-nephi",
        chapterNumber: 11,
        label: "Lees 3 Nephi 11",
      },
      {
        type: "poll",
        question: "Wat spreekt je het meest aan om als eerste te doen?",
        options: ["Een hoofdstuk lezen", "Een spelletje spelen ter oefening", "Eerst nog meer over het verhaal ontdekken"],
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat is een goed startpunt om zelf te beginnen met lezen?",
        answers: ["1 Nephi 1"],
        options: [
          { label: "1 Nephi 1", isCorrect: true },
          { label: "Moroni 10", isCorrect: false },
          { label: "Ether 15", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Je moet een hoofdstuk pas verder lezen als je alles er meteen van begrijpt.",
        answers: ["false"],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wat helpt om bij te houden wie wie is?",
        answers: ["Een overzicht erbij houden"],
        options: [
          { label: "Een overzicht erbij houden", isCorrect: true },
          { label: "Namen gewoon overslaan", isCorrect: false },
          { label: "Alleen de eerste letter van elke naam onthouden", isCorrect: false },
        ],
      },
    ],
  },
  {
    number: 11,
    slug: "je-eerste-hoofdstuk",
    title: "Je eerste hoofdstuk",
    summary: "Tijd om echt te beginnen — 1 Nephi 1.",
    blocks: [
      {
        type: "text",
        body:
          "Je hebt het verhaal gezien, de belangrijkste mensen leren kennen, en tips gekregen om te beginnen. Nu is " +
          "het moment om het zelf te gaan lezen.",
      },
      {
        type: "text",
        body:
          "1 Nephi 1 is geschreven door Nephi zelf, en is de allereerste bladzijde van het hele Boek van Mormon.",
      },
      {
        type: "chapterLink",
        bookSlug: "1-nephi",
        chapterNumber: 1,
        label: "Lees 1 Nephi 1",
      },
      {
        type: "text",
        body: "Kom hierna terug om deze les af te ronden.",
      },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie schreef 1 Nephi 1?",
        answers: ["Nephi"],
        options: [
          { label: "Nephi", isCorrect: true },
          { label: "Mormon", isCorrect: false },
          { label: "Lehi", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "1 Nephi 1 is het allereerste hoofdstuk van het Boek van Mormon.",
        answers: ["true"],
      },
    ],
  },
  {
    number: 12,
    slug: "jij-bent-klaar-om-te-ontdekken",
    title: "Jij bent klaar om te ontdekken",
    summary: "Een korte eindtoets, en drie manieren om verder te gaan.",
    blocks: [
      {
        type: "text",
        body:
          "Je hebt nu de basis: wie de belangrijkste personen zijn, hoe het boek is opgebouwd, waar het steeds weer " +
          "om draait, en hoe je zelf kunt beginnen met lezen. Tijd voor een korte eindtoets.",
      },
      {
        type: "reflection",
        question: "Wat is je grootste vraag die je nog hebt over het Boek van Mormon?",
      },
      { type: "finalChoices" },
    ],
    exercises: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Wie bracht de verslagen van eerdere schrijvers samen tot het Boek van Mormon?",
        answers: ["Mormon"],
        options: [
          { label: "Mormon", isCorrect: true },
          { label: "Nephi", isCorrect: false },
          { label: "Alma", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Lehi en Sariah zijn de ouders van Laman, Lemuel, Sam en Nephi.",
        answers: ["true"],
      },
      {
        type: "SEQUENCE",
        prompt: "Zet het verhaal in de juiste volgorde.",
        answers: ["Jeruzalem", "Wildernis", "Nieuw land", "Jezus Christus verschijnt"],
        wordBank: ["Jeruzalem", "Wildernis", "Nieuw land", "Jezus Christus verschijnt"],
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Waar draait het Boek van Mormon volgens zichzelf steeds weer om?",
        answers: ["Jezus Christus"],
        options: [
          { label: "Jezus Christus", isCorrect: true },
          { label: "Oorlogen", isCorrect: false },
          { label: "Koningen", isCorrect: false },
        ],
      },
      {
        type: "FILL_BLANK",
        prompt: "Een goed startpunt om zelf te beginnen met lezen is ______.",
        answers: ["1 nephi 1"],
        options: [
          { label: "1 Nephi 1", isCorrect: true },
          { label: "Moroni 10", isCorrect: false },
          { label: "Ether 1", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        prompt: "Een profeet geeft in het Boek van Mormon een boodschap van God door aan het volk.",
        answers: ["true"],
      },
    ],
  },
];
