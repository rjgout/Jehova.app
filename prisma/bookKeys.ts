// Taalonafhankelijke boeksleutels (Book.key): het pad dat de kerk zelf
// gebruikt in /study/scriptures/<key>/<hoofdstuk>. Dezelfde sleutel in elke
// taal betekent hetzelfde boek, dus een vers is overal te vinden via
// sleutel + hoofdstuk + versnummer. Hier gekoppeld aan de Nederlandse slugs
// van de huidige content; migratie 20260925110000_languages_foundation vult
// bestaande boeken met exact deze tabel. Uitgaven in andere talen geven de
// sleutel rechtstreeks mee in hun contentbestand.
export const BOOK_KEYS_BY_SLUG: Record<string, string> = {
  "1-nephi": "bofm/1-ne",
  "2-nephi": "bofm/2-ne",
  jakob: "bofm/jacob",
  enos: "bofm/enos",
  jarom: "bofm/jarom",
  omni: "bofm/omni",
  "woorden-van-mormon": "bofm/w-of-m",
  mosiah: "bofm/mosiah",
  alma: "bofm/alma",
  helaman: "bofm/hel",
  "3-nephi": "bofm/3-ne",
  "4-nephi": "bofm/4-ne",
  mormon: "bofm/morm",
  ether: "bofm/ether",
  moroni: "bofm/moro",
  "leer-en-verbonden": "dc-testament/dc",
  mozes: "pgp/moses",
  abraham: "pgp/abr",
  "joseph-smith-mattheus": "pgp/js-m",
  "joseph-smith-geschiedenis": "pgp/js-h",
  geloofsartikelen: "pgp/a-of-f",
};
