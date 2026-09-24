/**
 * Gebruikersnaam met discriminator ("Jan#83"), zoals op de vriendenpagina:
 * de naam valt op, "#83" is lichter en niet vet. Overal gebruiken waar een
 * naam met #-nummer in beeld staat; in platte tekst (bevestigingsvensters,
 * meldingen) blijft formatTag() uit src/lib/handle.ts.
 */
export default function UserTag({
  handle,
  discriminator,
  className = "",
}: {
  handle: string;
  discriminator: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {handle}
      <span className="text-slate-400 dark:text-slate-500 font-normal">#{discriminator}</span>
    </span>
  );
}
