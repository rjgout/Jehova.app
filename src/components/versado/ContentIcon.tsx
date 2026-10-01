import { BookMarked, BookOpen, Gem, LibraryBig, Mic2, ScrollText, type LucideIcon } from "lucide-react";

type ContentIdentity = { id: string; work: string | null };

function iconForContent(collection: ContentIdentity): LucideIcon {
  switch (collection.work ?? collection.id) {
    case "bofm":
      return BookOpen;
    case "fsy":
      return BookMarked;
    case "podcasts":
      return Mic2;
    case "dc-testament":
      return ScrollText;
    case "pgp":
      return Gem;
    default:
      return LibraryBig;
  }
}

export default function ContentIcon({ collection, className }: { collection: ContentIdentity; className: string }) {
  const Icon = iconForContent(collection);
  return <Icon className={className} aria-hidden />;
}
