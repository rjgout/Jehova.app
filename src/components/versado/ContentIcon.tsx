import { contentIcon } from "@/lib/contentMetadata";

type ContentIdentity = { id: string; work: string | null };

/** Het icoon van een contentbron, uit src/lib/contentMetadata.ts. */
export default function ContentIcon({ collection, className }: { collection: ContentIdentity; className: string }) {
  const Icon = contentIcon(collection);
  return <Icon className={className} aria-hidden />;
}
