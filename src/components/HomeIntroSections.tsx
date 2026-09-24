// Het kennismakingsdeel van de homepage, onder de aanmeldknoppen. Ook
// gebruikt op de uitnodigingspagina (/uitnodiging/<code>), zodat wie via een
// link van een vriend binnenkomt net zo goed ziet wat de app is.

// "Boek van Mormon" mag hier met opzet expliciet genoemd worden: dit
// beschrijft wat je vandaag daadwerkelijk krijgt (zie CLAUDE.md), niet een
// aanname dat de app daar voorgoed aan gebonden is — de architectuur staat
// een latere tweede cursus/contentcollectie nog steeds toe.
const FEATURES = [
  {
    icon: "📚",
    title: "Korte lessen",
    description: "Elke les over het Boek van Mormon past in een paar minuten — precies genoeg voor onderweg.",
  },
  {
    icon: "✍️",
    title: "Invuloefeningen",
    description: "Geen multiple choice: vul zelf ontbrekende woorden in of leg ze in de juiste volgorde.",
  },
  {
    icon: "🎙️",
    title: "Podcast",
    description:
      "Luister naar de podcast “Geloof je dat ook?” en beantwoord kennisvragen over elke aflevering — inclusief de link met het Boek van Mormon.",
  },
  {
    icon: "🔥",
    title: "Dag-streaks & freezes",
    description: "Bouw een reeks op, verdien streak freezes bij mijlpalen — en geef ze weg aan vrienden.",
  },
  {
    icon: "🤝",
    title: "Vrienden",
    description: "Zie elkaars voortgang, daag elkaar uit en vier successen samen.",
  },
  {
    icon: "💎",
    title: "Divisies",
    description: "Strijd wekelijks tegen spelers op jouw niveau en klim naar de volgende divisie.",
  },
  {
    icon: "⚡",
    title: "Live quiz samen",
    description: "Speel live tegen vrienden over een hoofdstuk — wie is het snelst en scherpst?",
  },
];

export default function HomeIntroSections({ displayName }: { displayName: string }) {
  return (
    <>
      {displayName === "Jehova" && (
        <div className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 max-w-xl text-left flex flex-col gap-2">
          <h2 className="font-extrabold text-lg text-brand-800 dark:text-brand-300">Waarom heet dit Jehova?</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Jehova is een naam voor Jezus Christus vóór Zijn geboorte. Die naam komt ook voor in het Boek van Mormon.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Het Boek van Mormon is &ldquo;een testament van Jezus Christus&rdquo;. Het is bedoeld om te getuigen dat
            Jezus de Christus is.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Daarom staat Zijn naam centraal in Jehova.app.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {FEATURES.map((f) => (
          <div key={f.title} className="card text-left">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-extrabold mb-1 dark:text-slate-100">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
