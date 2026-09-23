import type { FsyContentBlock } from "@/lib/fsyContent";

export default function FsyContentBlocks({ blocks }: { blocks: FsyContentBlock[] }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        if (block.type === "image" && block.url) {
          return (
            <figure key={index} className="flex flex-col gap-2">
              {/* De bronafbeeldingen blijven op de officiële website staan; zo slaan we ze niet dubbel op. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.url} alt={block.alt ?? ""} className="rounded-2xl w-full max-h-[32rem] object-contain bg-slate-50 dark:bg-slate-900" />
              {block.alt && <figcaption className="text-xs text-slate-400 dark:text-slate-500">{block.alt}</figcaption>}
            </figure>
          );
        }

        if (!block.text) return null;

        if (block.type === "heading") {
          return (
            <h2 key={index} className="text-xl font-extrabold text-brand-800 dark:text-brand-300 mt-2">
              {block.text}
            </h2>
          );
        }

        if (block.type === "list-item") {
          return (
            <div key={index} className="flex gap-3 text-slate-700 dark:text-slate-200">
              <span className="shrink-0 text-brand-500">•</span>
              <p>{block.text}</p>
            </div>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={index} className="border-l-4 border-brand-300 dark:border-brand-700 pl-4 italic text-slate-600 dark:text-slate-300">
              {block.text}
            </blockquote>
          );
        }

        return (
          <p key={index} className="leading-7 text-slate-700 dark:text-slate-200">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
