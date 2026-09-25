import type { MemoryData, PuzzleData, QuestionData, TopicData } from "../src/lib/alleskenner/content";

// Engelse versie van de handgeschreven onderdelen uit alleskennerContent.ts,
// per ID in dezelfde vorm. Opties, groepen en antwoorden staan in dezelfde
// volgorde als in het Nederlands (spelers in beide talen spelen op dezelfde
// vraag); citaten komen letterlijk uit de Engelse uitgave
// (prisma/bomContent.en.json) en worden gecontroleerd door
// `npm run alleskenner:check`. Galerijen met citaten zet
// prisma/alleskennerTranslate.ts zelf om; de plaatjes uit de oudere
// Nederlandse kinderverhalen hebben geen Engelse versie.

type Data = QuestionData | PuzzleData | TopicData | MemoryData;

export const alleskennerItemsEn: Record<string, Data> = {
  // --- 3-6-9 ---------------------------------------------------------------
  "vraag-0001": {
    prompt: "Who was commanded by the Lord to build a ship after the manner He would show?",
    options: ["Nephi", "Laman", "Zoram", "Sam"],
    answer: "Nephi",
    evidence: [
      { ref: "1 Nephi 17:7", quote: "I, Nephi, had been in the land of Bountiful for the space of many days" },
      { ref: "1 Nephi 17:8", quote: "Thou shalt construct a ship, after the manner which I shall show thee" },
    ],
  },
  "vraag-0002": {
    prompt: "What does the name Liahona mean, being interpreted?",
    options: ["Compass", "Light", "Promise", "Guide of the fathers"],
    answer: "Compass",
    evidence: [{ ref: "Alma 37:38", quote: "Liahona, which is, being interpreted, a compass" }],
  },
  "vraag-0003": {
    prompt: "Why did king Benjamin have a tower built?",
    options: [
      "So that his people could hear his words",
      "To see the enemy coming",
      "To keep the plates in",
      "Because the temple had been destroyed",
    ],
    answer: "So that his people could hear his words",
    evidence: [
      { ref: "Mosiah 2:7", quote: "he caused a tower to be erected, that thereby his people might hear the words which he should speak unto them" },
    ],
  },
  "vraag-0004": {
    prompt: "How did the prophet Abinadi die?",
    options: ["By fire", "By the sword", "He was stoned", "He drowned"],
    answer: "By fire",
    evidence: [{ ref: "Mosiah 17:20", quote: "when Abinadi had said these words, he fell, having suffered death by fire" }],
  },
  "vraag-0005": {
    prompt: "How many small stones did the brother of Jared molten out of a rock?",
    options: ["Sixteen", "Twelve", "Eight", "Twenty-four"],
    answer: "Sixteen",
    evidence: [{ ref: "Ether 3:1", quote: "did molten out of a rock sixteen small stones" }],
  },
  "vraag-0006": {
    prompt: "How long did Enos cry unto the Lord in mighty prayer?",
    options: ["All the day long, and still when the night came", "Three days and three nights", "Forty days", "One night watch"],
    answer: "All the day long, and still when the night came",
    evidence: [
      { ref: "Enos 1:4", quote: "all the day long did I cry unto him; yea, and when the night came I did still raise my voice high" },
    ],
  },
  "vraag-0007": {
    prompt: "What happened to Korihor after Alma had spoken to him?",
    options: ["He was struck dumb", "He was struck blind", "He fell down dead", "He was banished from Zarahemla"],
    answer: "He was struck dumb",
    evidence: [{ ref: "Alma 30:50", quote: "Korihor was struck dumb, that he could not have utterance" }],
  },
  "vraag-0008": {
    prompt: "What did Moroni call the pole with his rent coat?",
    options: ["The title of liberty", "The banner of the Lord", "The sign of Nephi", "The standard of Zarahemla"],
    answer: "The title of liberty",
    evidence: [
      { ref: "Alma 46:11", quote: "Moroni, who was the chief commander of the armies of the Nephites" },
      { ref: "Alma 46:13", quote: "he took the pole, which had on the end thereof his rent coat, (and he called it the title of liberty)" },
    ],
  },
  "vraag-0009": {
    prompt: "Where did Samuel the Lamanite stand when he prophesied to the people of Zarahemla?",
    options: ["On the wall of the city", "On a tower", "In the temple", "On the hill Cumorah"],
    answer: "On the wall of the city",
    evidence: [
      { ref: "Helaman 13:2", quote: "there was one Samuel, a Lamanite, came into the land of Zarahemla" },
      { ref: "Helaman 13:4", quote: "he went and got upon the wall thereof" },
    ],
  },
  "vraag-0010": {
    prompt: "At the temple in which land was the multitude gathered when the Savior appeared to them?",
    options: ["The land Bountiful", "The land of Zarahemla", "The land of Nephi", "The land Desolation"],
    answer: "The land Bountiful",
    evidence: [
      { ref: "3 Nephi 11:1", quote: "round about the temple which was in the land Bountiful" },
      { ref: "3 Nephi 11:8", quote: "they saw a Man descending out of heaven" },
    ],
  },
  "vraag-0011": {
    prompt: "How many stripling soldiers marched with Helaman?",
    options: ["Two thousand", "Two hundred", "One thousand", "Five hundred"],
    answer: "Two thousand",
    evidence: [{ ref: "Alma 53:22", quote: "Helaman did march at the head of his two thousand stripling soldiers" }],
  },
  "vraag-0012": {
    prompt: "In which hill did Mormon hide up the records that had been entrusted to him?",
    options: ["Cumorah", "Shelem", "Riplah", "Onidah"],
    answer: "Cumorah",
    evidence: [
      { ref: "Mormon 6:6", quote: "hid up in the hill Cumorah all the records which had been entrusted to me by the hand of the Lord" },
    ],
  },
  "vraag-0013": {
    prompt: "What was on the plates of brass that Laban had?",
    options: [
      "The record of the Jews and a genealogy",
      "The laws of king Zedekiah",
      "The prophecies of Samuel",
      "A map of the promised land",
    ],
    answer: "The record of the Jews and a genealogy",
    evidence: [
      { ref: "1 Nephi 3:3", quote: "Laban hath the record of the Jews and also a genealogy of my forefathers" },
    ],
  },
  "vraag-0014": {
    prompt: "In which waters were the people who followed Alma baptized?",
    options: ["The waters of Mormon", "The water of Sebus", "The river Sidon", "The Red Sea"],
    answer: "The waters of Mormon",
    evidence: [
      { ref: "Mosiah 18:1", quote: "Alma, who had fled from the servants of king Noah" },
      { ref: "Mosiah 18:16", quote: "they were baptized in the waters of Mormon" },
    ],
  },
  "vraag-0015": {
    prompt: "Who became a servant to king Lamoni and watched his flocks?",
    options: ["Ammon", "Aaron", "Amulek", "Alma"],
    answer: "Ammon",
    evidence: [{ ref: "Alma 17:25", quote: "Therefore Ammon became a servant to king Lamoni" }],
  },
  "vraag-0016": {
    prompt: "What did Alma compare the word to when he spoke to the Zoramites?",
    options: ["A seed", "A lamp", "A river", "A sword"],
    answer: "A seed",
    evidence: [
      { ref: "Alma 31:1", quote: "Alma having received tidings that the Zoramites were perverting the ways of the Lord" },
      { ref: "Alma 32:28", quote: "Now, we will compare the word unto a seed" },
    ],
  },
  "vraag-0017": {
    prompt: "What did the converted Lamanites of Alma 24 do with their swords?",
    options: ["They buried them deep in the earth", "They melted them down", "They gave them to the Nephites", "They cast them into the sea"],
    answer: "They buried them deep in the earth",
    evidence: [
      { ref: "Alma 24:17", quote: "they took their swords, and all the weapons" },
      { ref: "Alma 24:17", quote: "they did bury them up deep in the earth" },
    ],
  },
  "vraag-0018": {
    prompt: "How many plates of pure gold were brought to king Limhi?",
    options: ["Twenty-four", "Twelve", "Sixteen", "Eight"],
    answer: "Twenty-four",
    evidence: [
      { ref: "Mosiah 8:9", quote: "they have brought twenty-four plates" },
      { ref: "Mosiah 8:9", quote: "they are of pure gold" },
    ],
  },
  "vraag-0019": {
    prompt: "What did Hagoth build on the borders of the land Bountiful?",
    options: ["An exceedingly large ship", "A tower", "A temple", "A fortified city"],
    answer: "An exceedingly large ship",
    evidence: [
      { ref: "Alma 63:5", quote: "Hagoth, he being an exceedingly curious man, therefore he went forth and built him an exceedingly large ship" },
    ],
  },
  "vraag-0020": {
    prompt: "Listen: who spoke these words to his people?",
    options: ["King Benjamin", "King Mosiah", "Alma", "King Noah"],
    answer: "King Benjamin",
    listen: { ref: "Mosiah 2:17" },
    evidence: [
      { ref: "Mosiah 2:7", quote: "king Benjamin could not teach them all within the walls of the temple" },
      { ref: "Mosiah 2:17", quote: "when ye are in the service of your fellow beings ye are only in the service of your God" },
    ],
  },
  "vraag-0021": {
    prompt: "Listen: who wrote this promise?",
    options: ["Moroni", "Mormon", "Nephi", "Ether"],
    answer: "Moroni",
    listen: { ref: "Moroni 10:4" },
    evidence: [
      { ref: "Moroni 10:1", quote: "Now I, Moroni, write somewhat as seemeth me good" },
      { ref: "Moroni 10:4", quote: "he will manifest the truth of it unto you, by the power of the Holy Ghost" },
    ],
  },

  // --- Puzzel --------------------------------------------------------------
  "puzzel-0001": {
    groups: [
      {
        answer: "Liahona",
        accept: ["the liahona"],
        clues: ["Ball of fine brass", "Two spindles", "Interpreted: a compass", "Ceased to work when Nephi was bound"],
        evidence: [
          { ref: "1 Nephi 16:10", quote: "a round ball of curious workmanship; and it was of fine brass" },
          { ref: "1 Nephi 16:10", quote: "within the ball were two spindles" },
          { ref: "Alma 37:38", quote: "Liahona, which is, being interpreted, a compass" },
          { ref: "1 Nephi 18:12", quote: "the compass, which had been prepared of the Lord, did cease to work" },
        ],
      },
      {
        answer: "Tower",
        accept: ["towers", "the tower"],
        clues: ["King Benjamin had one erected", "Jared and his brother came from it", "The language was confounded there", "Built in the midst of the vineyard"],
        evidence: [
          { ref: "Mosiah 2:7", quote: "he caused a tower to be erected" },
          { ref: "Ether 1:33", quote: "Which Jared came forth with his brother and their families" },
          { ref: "Omni 1:22", quote: "came out from the tower, at the time the Lord confounded the language of the people" },
          { ref: "2 Nephi 15:2", quote: "built a tower in the midst of it" },
        ],
      },
      {
        answer: "Ship",
        accept: ["ships", "boat", "boats", "vessel", "vessels", "barge", "barges"],
        clues: ["Nephi had to construct one", "Hagoth built an exceedingly large one", "Light upon the water, like a fowl", "The brother of Jared had eight"],
        evidence: [
          { ref: "1 Nephi 17:8", quote: "Thou shalt construct a ship" },
          { ref: "Alma 63:5", quote: "built him an exceedingly large ship" },
          { ref: "Ether 2:16", quote: "they were light upon the water, even like unto the lightness of a fowl upon the water" },
          { ref: "Ether 3:1", quote: "now the number of the vessels which had been prepared was eight" },
        ],
      },
    ],
  },
  "puzzel-0002": {
    groups: [
      {
        answer: "Wall",
        accept: ["walls", "the wall", "city wall"],
        clues: ["Samuel the Lamanite got upon it", "Aminadi interpreted the writing on it", "Moroni came upon it in the darkness", "Stones and arrows could not hit him there"],
        evidence: [
          { ref: "Helaman 13:4", quote: "he went and got upon the wall thereof" },
          { ref: "Alma 10:2", quote: "Aminadi who interpreted the writing which was upon the wall of the temple" },
          { ref: "Alma 62:20", quote: "Moroni went forth in the darkness of the night, and came upon the top of the wall" },
          { ref: "Helaman 16:2", quote: "they could not hit him with their stones neither with their arrows" },
        ],
      },
      {
        answer: "Sword",
        accept: ["swords", "the sword"],
        clues: ["Hilt of pure gold", "Ammon smote off arms with it", "Buried deep in the earth", "Blade of the most precious steel"],
        evidence: [
          { ref: "1 Nephi 4:9", quote: "the hilt thereof was of pure gold" },
          { ref: "Alma 17:37", quote: "he smote off their arms with his sword" },
          { ref: "Alma 24:17", quote: "they took their swords" },
          { ref: "1 Nephi 4:9", quote: "the blade thereof was of the most precious steel" },
        ],
      },
      {
        answer: "Seed",
        accept: ["seeds", "a seed", "the seed"],
        clues: ["Alma compared the word to it", "Begins to swell within your breast", "Do not cast it out by unbelief", "Enlarges your soul"],
        evidence: [
          { ref: "Alma 32:28", quote: "we will compare the word unto a seed" },
          { ref: "Alma 32:28", quote: "it will begin to swell within your breasts" },
          { ref: "Alma 32:28", quote: "if ye do not cast it out by your unbelief" },
          { ref: "Alma 32:28", quote: "it beginneth to enlarge my soul" },
        ],
      },
    ],
  },
  "puzzel-0003": {
    groups: [
      {
        answer: "Plates",
        accept: ["plate", "the plates"],
        clues: ["Laban had them of brass", "Twenty-four of pure gold", "The people of Mosiah brought them to Zarahemla", "Mormon wrote out of those of Nephi"],
        evidence: [
          { ref: "1 Nephi 3:3", quote: "they are engraven upon plates of brass" },
          { ref: "Mosiah 8:9", quote: "they have brought twenty-four plates" },
          { ref: "Omni 1:14", quote: "the Lord had sent the people of Mosiah with the plates of brass" },
          { ref: "Mormon 6:6", quote: "I made this record out of the plates of Nephi" },
        ],
      },
      {
        answer: "Stones",
        accept: ["stone", "the stones"],
        clues: ["The brother of Jared moltened sixteen", "Gazelem received one that shines in darkness", "Cast at Samuel on the wall", "White and clear as transparent glass"],
        evidence: [
          { ref: "Ether 3:1", quote: "did molten out of a rock sixteen small stones" },
          { ref: "Alma 37:23", quote: "I will prepare unto my servant Gazelem, a stone, which shall shine forth in darkness" },
          { ref: "Helaman 16:2", quote: "they cast stones at him upon the wall" },
          { ref: "Ether 3:1", quote: "they were white and clear, even as transparent glass" },
        ],
      },
      {
        answer: "Baptism",
        accept: ["baptize", "baptized", "baptizing", "the baptism"],
        clues: ["The waters of Mormon", "A witness of a covenant", "About two hundred and four souls", "In the name of the Lord"],
        evidence: [
          { ref: "Mosiah 18:16", quote: "they were baptized in the waters of Mormon" },
          { ref: "Mosiah 18:10", quote: "as a witness before him that ye have entered into a covenant with him" },
          { ref: "Mosiah 18:16", quote: "they were in number about two hundred and four souls" },
          { ref: "Mosiah 18:10", quote: "being baptized in the name of the Lord" },
        ],
      },
    ],
  },

  // --- Onderwerpen -----------------------------------------------------------
  "onderwerp-0001": {
    subject: "Nephi",
    answers: [
      { text: "Son of Lehi", accept: ["lehi", "father lehi"], evidence: { ref: "1 Nephi 1:5", quote: "my father, Lehi" } },
      { text: "Had to construct a ship", accept: ["ship", "built a ship"], evidence: { ref: "1 Nephi 17:8", quote: "Thou shalt construct a ship" } },
      { text: "Broke his bow of fine steel", accept: ["bow", "broken bow"], evidence: { ref: "1 Nephi 16:18", quote: "I did break my bow, which was made of fine steel" } },
      { text: "Brother of Laman, Lemuel, and Sam", accept: ["laman", "lemuel", "sam", "brothers"], evidence: { ref: "1 Nephi 2:5", quote: "my elder brothers, who were Laman, Lemuel, and Sam" } },
      { text: "Said: I will go and do the things which the Lord hath commanded", accept: ["i will go and do", "go and do"], evidence: { ref: "1 Nephi 3:7", quote: "I will go and do the things which the Lord hath commanded" } },
    ],
    distractors: [
      "Suffered death by fire",
      "Was struck dumb",
      "Rent his coat",
      "Had a tower erected",
      "Got upon the wall of Zarahemla",
      "Moltened sixteen stones",
      "Watched the flocks of Lamoni",
      "Built a ship on the borders of Bountiful",
    ],
  },
  "onderwerp-0002": {
    subject: "Ammon, the son of Mosiah",
    answers: [
      { text: "Son of king Mosiah", accept: ["mosiah", "son of mosiah"], evidence: { ref: "Mosiah 27:34", quote: "their names were Ammon, and Aaron, and Omner, and Himni; these were the names of the sons of Mosiah" } },
      { text: "Brother of Aaron", accept: ["aaron", "brother of aaron"], evidence: { ref: "Mosiah 27:34", quote: "Ammon, and Aaron, and Omner, and Himni" } },
      { text: "Became a servant to king Lamoni", accept: ["servant", "lamoni"], evidence: { ref: "Alma 17:25", quote: "Ammon became a servant to king Lamoni" } },
      { text: "Watched the flocks of Lamoni", accept: ["flocks", "watch the flocks", "flock"], evidence: { ref: "Alma 17:25", quote: "to watch the flocks of Lamoni" } },
      { text: "Smote off arms with his sword", accept: ["arms", "smote off arms", "sword"], evidence: { ref: "Alma 17:37", quote: "he smote off their arms with his sword" } },
    ],
    distractors: [
      "Son of Lehi",
      "Broke his bow of fine steel",
      "Stood on the wall of Zarahemla",
      "Had a tower erected",
      "Was struck dumb",
      "Led two thousand stripling soldiers",
      "Hid up the plates in Cumorah",
      "Prayed all the day long in the forest",
    ],
  },
  "onderwerp-0003": {
    subject: "Moroni, the chief commander",
    answers: [
      { text: "Chief commander of the Nephite armies", accept: ["chief commander", "commander", "captain"], evidence: { ref: "Alma 46:11", quote: "Moroni, who was the chief commander of the armies of the Nephites" } },
      { text: "Was angry with Amalickiah", accept: ["amalickiah"], evidence: { ref: "Alma 46:11", quote: "he was angry with Amalickiah" } },
      { text: "Rent his coat", accept: ["coat", "rent coat"], evidence: { ref: "Alma 46:12", quote: "he rent his coat" } },
      { text: "The title of liberty", accept: ["title", "title of liberty", "liberty"], evidence: { ref: "Alma 46:13", quote: "he called it the title of liberty" } },
      { text: "Came upon the wall at night", accept: ["wall", "on the wall"], evidence: { ref: "Alma 62:20", quote: "Moroni went forth in the darkness of the night, and came upon the top of the wall" } },
    ],
    distractors: [
      "Wrote the promise of Moroni 10:4",
      "Hid up the plates in Cumorah",
      "Had a tower erected",
      "Son of Lehi",
      "Suffered death by fire",
      "Became a servant to king Lamoni",
      "Built an exceedingly large ship",
      "Was struck dumb",
    ],
  },
  "onderwerp-0004": {
    subject: "King Benjamin",
    answers: [
      { text: "Had a tower erected", accept: ["tower"], evidence: { ref: "Mosiah 2:7", quote: "he caused a tower to be erected" } },
      { text: "Labored with his own hands", accept: ["own hands", "hands"], evidence: { ref: "Mosiah 2:14", quote: "I, myself, have labored with mine own hands that I might serve you" } },
      { text: "In the service of your fellow beings you are in the service of God", accept: ["fellow beings", "service of god"], evidence: { ref: "Mosiah 2:17", quote: "when ye are in the service of your fellow beings ye are only in the service of your God" } },
      { text: "The natural man is an enemy to God", accept: ["natural man"], evidence: { ref: "Mosiah 3:19", quote: "the natural man is an enemy to God" } },
      { text: "His son was called Mosiah", accept: ["mosiah", "father of mosiah"], evidence: { ref: "Mosiah 1:10", quote: "he had Mosiah brought before him" } },
    ],
    distractors: [
      "Suffered death by fire",
      "Rent his coat",
      "Watched the flocks of Lamoni",
      "Baptized in the waters of Mormon",
      "Compared the word to a seed",
      "Broke his bow of fine steel",
      "Got upon the wall of the city",
      "Moltened sixteen stones",
    ],
  },
  "onderwerp-0005": {
    subject: "Alma, the son of Alma",
    answers: [
      { text: "Son of Alma", accept: ["alma the elder", "father alma"], evidence: { ref: "Mosiah 27:14", quote: "his servant, Alma, who is thy father" } },
      { text: "An angel appeared to him", accept: ["angel"], evidence: { ref: "Mosiah 27:11", quote: "the angel of the Lord appeared unto them" } },
      { text: "Korihor was struck dumb", accept: ["korihor", "dumb"], evidence: { ref: "Alma 30:50", quote: "Korihor was struck dumb" } },
      { text: "Compared the word to a seed", accept: ["seed"], evidence: { ref: "Alma 32:28", quote: "we will compare the word unto a seed" } },
      { text: "Was accused together with Amulek by Zeezrom", accept: ["zeezrom", "amulek"], evidence: { ref: "Alma 10:31", quote: "Zeezrom. Now he was the foremost to accuse Amulek and Alma" } },
    ],
    distractors: [
      "Had a tower erected",
      "Smote off arms with his sword",
      "Suffered death by fire",
      "Led two thousand stripling soldiers",
      "Broke his bow of fine steel",
      "Rent his coat",
      "Hid up the plates in Cumorah",
      "Son of king Mosiah",
    ],
  },
  "onderwerp-0006": {
    subject: "Lehi",
    answers: [
      { text: "Father of Nephi", accept: ["nephi", "father"], evidence: { ref: "1 Nephi 1:5", quote: "my father, Lehi" } },
      { text: "Had dwelt at Jerusalem all his days", accept: ["jerusalem"], evidence: { ref: "1 Nephi 1:4", quote: "my father, Lehi, having dwelt at Jerusalem in all his days" } },
      { text: "His wife was called Sariah", accept: ["sariah"], evidence: { ref: "1 Nephi 2:5", quote: "my mother, Sariah" } },
      { text: "Saw in a dream a tree with desirable fruit", accept: ["dream", "vision", "tree", "tree of life"], evidence: { ref: "1 Nephi 8:10", quote: "I beheld a tree, whose fruit was desirable to make one happy" } },
      { text: "Found a brass ball at the door of his tent", accept: ["liahona", "compass", "ball"], evidence: { ref: "1 Nephi 16:10", quote: "as my father arose in the morning, and went forth to the tent door" } },
    ],
    distractors: [
      "Suffered death by fire",
      "Saw the finger of the Lord",
      "Got upon the wall of Zarahemla",
      "Had a tower erected",
      "Led two thousand stripling soldiers",
      "Was struck dumb",
      "Rent his coat",
      "Hid up the plates in Cumorah",
    ],
  },
  "onderwerp-0007": {
    subject: "Abinadi",
    answers: [
      { text: "Suffered death by fire", accept: ["fire", "burned", "burnt"], evidence: { ref: "Mosiah 17:20", quote: "having suffered death by fire" } },
      { text: "Prophesied against the people of king Noah", accept: ["king noah", "noah"], evidence: { ref: "Mosiah 13:5", quote: "the people of king Noah durst not lay their hands on him" } },
      { text: "His face shone", accept: ["shone", "face shone", "luster"], evidence: { ref: "Mosiah 13:5", quote: "his face shone with exceeding luster" } },
      { text: "Alma believed his words", accept: ["alma"], evidence: { ref: "Mosiah 17:2", quote: "he believed the words which Abinadi had spoken" } },
      { text: "Said: Thus saith the Lord, wo be unto this people", accept: ["wo be unto this people", "prophesied"], evidence: { ref: "Mosiah 11:20", quote: "thus saith the Lord—Wo be unto this people" } },
    ],
    distractors: [
      "Father of Nephi",
      "Had a tower erected",
      "Saw the finger of the Lord",
      "Watched the flocks of Lamoni",
      "Foretold a new star",
      "Built a ship",
      "Hid up the plates in Cumorah",
      "Led the Nephite armies",
    ],
  },
  "onderwerp-0008": {
    subject: "Samuel the Lamanite",
    answers: [
      { text: "Was a Lamanite", accept: ["lamanite"], evidence: { ref: "Helaman 13:2", quote: "one Samuel, a Lamanite" } },
      { text: "Stood upon the wall", accept: ["wall", "on the wall"], evidence: { ref: "Helaman 13:4", quote: "he went and got upon the wall thereof" } },
      { text: "Stones and arrows could not hit him", accept: ["stones", "arrows"], evidence: { ref: "Helaman 16:2", quote: "they could not hit him with their stones neither with their arrows" } },
      { text: "Foretold a day and a night and a day without darkness", accept: ["day and night", "no night", "two days and a night"], evidence: { ref: "Helaman 14:4", quote: "there shall be one day and a night and a day, as if it were one day and there were no night" } },
      { text: "Foretold a new star", accept: ["star", "new star"], evidence: { ref: "Helaman 14:5", quote: "there shall a new star arise" } },
    ],
    distractors: [
      "Suffered death by fire",
      "Son of king Mosiah",
      "Had a tower erected",
      "Moltened sixteen stones",
      "Rent his coat",
      "Father of Nephi",
      "Was struck dumb",
      "Watched the flocks of Lamoni",
    ],
  },
  "onderwerp-0009": {
    subject: "The brother of Jared",
    answers: [
      { text: "Moltened sixteen small stones", accept: ["sixteen stones", "stones"], evidence: { ref: "Ether 3:1", quote: "did molten out of a rock sixteen small stones" } },
      { text: "Went up to the mount Shelem", accept: ["shelem", "mount"], evidence: { ref: "Ether 3:1", quote: "went forth unto the mount, which they called the mount Shelem" } },
      { text: "Saw the finger of the Lord", accept: ["finger", "finger of the lord"], evidence: { ref: "Ether 3:6", quote: "he saw the finger of the Lord" } },
      { text: "Had eight vessels", accept: ["eight", "vessels", "barges"], evidence: { ref: "Ether 3:1", quote: "now the number of the vessels which had been prepared was eight" } },
      { text: "Built barges as light as a fowl upon the water", accept: ["light as a fowl", "barges"], evidence: { ref: "Ether 2:16", quote: "even like unto the lightness of a fowl upon the water" } },
    ],
    distractors: [
      "Had a tower erected",
      "Suffered death by fire",
      "Built an exceedingly large ship near Bountiful",
      "Got upon the wall of Zarahemla",
      "Rent his coat",
      "Found a brass ball at his tent",
      "Became a servant to king Lamoni",
      "Hid up the plates in Cumorah",
    ],
  },
  "onderwerp-0010": {
    subject: "Mormon",
    answers: [
      { text: "Hid up the records in the hill Cumorah", accept: ["cumorah", "hill cumorah"], evidence: { ref: "Mormon 6:6", quote: "hid up in the hill Cumorah all the records" } },
      { text: "Gave a few plates to his son Moroni", accept: ["moroni", "son moroni"], evidence: { ref: "Mormon 6:6", quote: "save it were these few plates which I gave unto my son Moroni" } },
      { text: "Became leader of the Nephite armies", accept: ["leader", "armies", "leader of the armies"], evidence: { ref: "Mormon 2:1", quote: "the people of Nephi appointed me that I should be their leader, or the leader of their armies" } },
      { text: "Was about ten years old when Ammaron came to him", accept: ["ten years", "ammaron"], evidence: { ref: "Mormon 1:2", quote: "I being about ten years of age" } },
      { text: "Was large in stature", accept: ["large", "stature"], evidence: { ref: "Mormon 2:1", quote: "notwithstanding I being young, was large in stature" } },
    ],
    distractors: [
      "Wrote the promise of Moroni 10:4",
      "Rent his coat",
      "Had a tower erected",
      "Suffered death by fire",
      "Saw the finger of the Lord",
      "Watched the flocks of Lamoni",
      "Foretold a new star",
      "Broke his bow of fine steel",
    ],
  },
  "onderwerp-0011": {
    subject: "Korihor",
    answers: [
      { text: "Was an Anti-Christ", accept: ["antichrist", "anti-christ"], evidence: { ref: "Alma 30:12", quote: "this Anti-Christ, whose name was Korihor" } },
      { text: "Preached that there should be no Christ", accept: ["no christ"], evidence: { ref: "Alma 30:12", quote: "began to preach unto the people that there should be no Christ" } },
      { text: "Asked Alma for a sign", accept: ["sign"], evidence: { ref: "Alma 30:43", quote: "If thou wilt show me a sign" } },
      { text: "Was struck dumb", accept: ["dumb", "could not speak"], evidence: { ref: "Alma 30:50", quote: "Korihor was struck dumb" } },
      { text: "Was trodden down among the Zoramites", accept: ["trodden down", "zoramites"], evidence: { ref: "Alma 30:59", quote: "he was run upon and trodden down" } },
    ],
    distractors: [
      "Suffered death by fire",
      "Accused Amulek and Alma",
      "Stood on the wall of Zarahemla",
      "Became a servant to king Lamoni",
      "Had a tower erected",
      "Hid up the plates in Cumorah",
      "Saw the finger of the Lord",
      "Broke his bow of fine steel",
    ],
  },

  // --- Collectief Geheugen ---------------------------------------------------
  "geheugen-0001": {
    title: "Ammon with the flocks of Lamoni",
    passage: "Alma 17:25-27",
    answers: [
      { text: "Ammon became a servant to king Lamoni", accept: ["servant", "lamoni"], evidence: { ref: "Alma 17:25", quote: "Ammon became a servant to king Lamoni" } },
      { text: "He had to watch the flocks", accept: ["flocks", "watch the flocks"], evidence: { ref: "Alma 17:25", quote: "to watch the flocks of Lamoni" } },
      { text: "After three days in the service of the king", accept: ["three days"], evidence: { ref: "Alma 17:26", quote: "after he had been in the service of the king three days" } },
      { text: "The water of Sebus", accept: ["sebus", "place of water"], evidence: { ref: "Alma 17:26", quote: "which was called the water of Sebus" } },
      { text: "Lamanites scattered the flocks", accept: ["scattered", "flocks scattered"], evidence: { ref: "Alma 17:27", quote: "scattered the flocks of Ammon and the servants of the king" } },
    ],
    distractors: [
      "The waters of Mormon",
      "Ammon was king of Zarahemla",
      "The flocks drowned",
      "After forty days of service",
      "Lamoni watched the flocks himself",
      "The river Sidon",
      "Ammon fled into the wilderness",
    ],
  },
  "geheugen-0002": {
    title: "The stones of the brother of Jared",
    passage: "Ether 3:1-6",
    answers: [
      { text: "There were eight vessels", accept: ["eight"], evidence: { ref: "Ether 3:1", quote: "the number of the vessels which had been prepared was eight" } },
      { text: "The mount Shelem", accept: ["shelem"], evidence: { ref: "Ether 3:1", quote: "which they called the mount Shelem" } },
      { text: "Sixteen small stones", accept: ["sixteen", "stones"], evidence: { ref: "Ether 3:1", quote: "sixteen small stones" } },
      { text: "The stones were to shine forth in darkness", accept: ["light", "shine"], evidence: { ref: "Ether 3:4", quote: "that they may shine forth in darkness" } },
      { text: "He saw the finger of the Lord", accept: ["finger"], evidence: { ref: "Ether 3:6", quote: "he saw the finger of the Lord" } },
    ],
    distractors: [
      "There were twelve vessels",
      "Mount Sinai",
      "Twenty-four gold plates",
      "The stones were cast into the sea",
      "He saw an angel in a cloud",
      "The hill Cumorah",
      "A round ball of brass",
    ],
  },
  "geheugen-0003": {
    title: "Samuel comes to Zarahemla",
    passage: "Helaman 13:2-4",
    answers: [
      { text: "Samuel was a Lamanite", accept: ["lamanite"], evidence: { ref: "Helaman 13:2", quote: "one Samuel, a Lamanite" } },
      { text: "He came into the land of Zarahemla", accept: ["zarahemla"], evidence: { ref: "Helaman 13:2", quote: "came into the land of Zarahemla" } },
      { text: "The people cast him out", accept: ["cast out", "sent away"], evidence: { ref: "Helaman 13:2", quote: "they did cast him out" } },
      { text: "The voice of the Lord told him to return", accept: ["return", "voice of the lord"], evidence: { ref: "Helaman 13:3", quote: "the voice of the Lord came unto him, that he should return again" } },
      { text: "He got upon the wall", accept: ["wall"], evidence: { ref: "Helaman 13:4", quote: "he went and got upon the wall thereof" } },
    ],
    distractors: [
      "Samuel was a Nephite",
      "He came into the land Bountiful",
      "The people baptized him",
      "He climbed a tower",
      "He preached in the temple",
      "He became king of Zarahemla",
      "He fled into the wilderness",
    ],
  },
  "geheugen-0004": {
    title: "At the waters of Mormon",
    passage: "Mosiah 18:8-10",
    answers: [
      { text: "The waters of Mormon", accept: ["mormon", "waters"], evidence: { ref: "Mosiah 18:8", quote: "Behold, here are the waters of Mormon" } },
      { text: "Bear one another's burdens", accept: ["bear burdens", "burdens"], evidence: { ref: "Mosiah 18:8", quote: "are willing to bear one another’s burdens" } },
      { text: "Mourn with those that mourn", accept: ["mourn"], evidence: { ref: "Mosiah 18:9", quote: "are willing to mourn with those that mourn" } },
      { text: "Stand as witnesses of God", accept: ["witness", "witnesses of god"], evidence: { ref: "Mosiah 18:9", quote: "to stand as witnesses of God" } },
      { text: "Be baptized in the name of the Lord", accept: ["baptize", "baptism", "baptized"], evidence: { ref: "Mosiah 18:10", quote: "being baptized in the name of the Lord" } },
    ],
    distractors: [
      "The water of Sebus",
      "Build a tower",
      "The title of liberty",
      "The river Sidon",
      "Sixteen small stones",
      "Pay tithing",
      "The land Bountiful",
    ],
  },
};
