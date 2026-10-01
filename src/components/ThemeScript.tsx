// Voorkomt een flits van het verkeerde thema: dit script draait vóór React
// hydrateert en zet de 'dark' class direct op <html> op basis van de
// opgeslagen voorkeur (of het systeemthema als er nog geen voorkeur is, zie
// ThemePreference.tsx). Zonder eigen voorkeur volgt de app ook een
// wisseling van het systeemthema terwijl hij open staat.
const THEME_SCRIPT = `
(function () {
  try {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var apply = function () {
      var stored = localStorage.getItem('bom-theme');
      document.documentElement.classList.toggle('dark', stored ? stored === 'dark' : media.matches);
    };
    apply();
    if (media.addEventListener) media.addEventListener('change', apply);
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
