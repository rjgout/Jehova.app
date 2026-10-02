# Toekomstige Rive-assets

Deze map reserveert de conventies voor een latere Rive-implementatie. Er is
nu geen Rive-runtime, geen state machine en geen `.riv`-bestand in de app.

Toekomstige bronbestanden horen logisch onder `source/novi/`,
`source/varo/` en `source/vera/`; reproduceerbare runtime-builds horen onder
`builds/`. Lege mappen worden niet vooruit aangemaakt.

Rive-states gebruiken dezelfde semantische namen als het centrale
mascotteregister. De keten blijft:

`feature → MascotSlot(character, state) → centrale renderer → Rive met static WebP-fallback`

De static WebP blijft terugval voor `prefers-reduced-motion`, laden, fouten
en contexten waarin beweging niets toevoegt. Rigging en beweging volgen
altijd `docs/VERSADO-CHARACTER-CANON.md`; animatie mag de identiteit,
proporties, kleuren of basismodellen niet herinterpreteren.
