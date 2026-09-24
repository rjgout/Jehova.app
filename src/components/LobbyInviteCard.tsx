"use client";

import { useState } from "react";
import FriendPicker from "@/components/FriendPicker";
import UserAvatar from "@/components/UserAvatar";

const SHOWN_AVATARS = 6;

/**
 * Vrienden uitnodigen in een spellobby: geen lange lijst met alle vrienden in
 * de lobby zelf, maar één knop die het vriendenpaneel opent (zoeken, online
 * eerst), met eronder wie er al is uitgenodigd.
 */
export default function LobbyInviteCard({
  title = "Vrienden uitnodigen",
  friends,
  invitedIds,
  joinedIds,
  onInvite,
}: {
  title?: string;
  friends: { id: string; handle: string }[];
  invitedIds: Set<string>;
  joinedIds: string[];
  onInvite: (friendId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const waiting = friends.filter((f) => invitedIds.has(f.id) && !joinedIds.includes(f.id));

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-extrabold dark:text-slate-100">{title}</h2>
        <button type="button" className="btn-secondary shrink-0 whitespace-nowrap !px-3 !py-1.5 !text-sm" onClick={() => setOpen(true)}>
          + Nodig uit
        </button>
      </div>
      {waiting.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {waiting.slice(0, SHOWN_AVATARS).map((f) => (
              <UserAvatar key={f.id} id={f.id} handle={f.handle} size="xs" className="ring-2 ring-white dark:ring-slate-800" />
            ))}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {waiting.length === 1
              ? `${waiting[0].handle} is uitgenodigd`
              : `${waiting.length} vrienden uitgenodigd`}
            {waiting.length > SHOWN_AVATARS ? ` (+${waiting.length - SHOWN_AVATARS})` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nodig vrienden uit; ze krijgen meteen een melding.</p>
      )}
      <FriendPicker
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle="Wie online is, staat bovenaan."
        onInvite={(friend) => onInvite(friend.id)}
        stateFor={(id) => (joinedIds.includes(id) ? "joined" : invitedIds.has(id) ? "invited" : "invite")}
      />
    </div>
  );
}
