"use client";

import { useActionState, useState } from "react";
import { addStockComment, confirmWebsiteUpdated, toggleStockArchive } from "@/app/actions/stock";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { StockCheckComment, User } from "@prisma/client";

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-600">{error}</p>;
}

// ---- Website-updated confirmation (admin only) -------------------------------

export function WebsiteUpdatedControl({
  stockCheckId,
  confirmed,
  confirmedByName,
  confirmedAt,
  canConfirm,
}: {
  stockCheckId: string;
  confirmed: boolean;
  confirmedByName?: string;
  confirmedAt?: Date;
  canConfirm: boolean;
}) {
  const [, action, pending] = useActionState(confirmWebsiteUpdated, undefined);

  if (!canConfirm) {
    return confirmed ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        ✓ Updated by {confirmedByName}
        {confirmedAt ? ` · ${formatDate(confirmedAt)}` : ""}
      </span>
    ) : (
      <span className="text-xs text-zinc-400">Not yet updated on website</span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="stockCheckId" value={stockCheckId} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50 ${
          confirmed
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        {pending
          ? "Saving…"
          : confirmed
            ? `✓ Updated by ${confirmedByName ?? "you"}`
            : "Mark updated on website"}
      </button>
    </form>
  );
}

// ---- Archive (Fulfillment/Admin — dismiss from active tables) ----------------

export function ArchiveControl({
  stockCheckId,
  archived,
  canArchive,
}: {
  stockCheckId: string;
  archived: boolean;
  canArchive: boolean;
}) {
  const [, action, pending] = useActionState(toggleStockArchive, undefined);

  if (!canArchive) return null;

  return (
    <form action={action}>
      <input type="hidden" name="stockCheckId" value={stockCheckId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? "Saving…" : archived ? "Unarchive" : "Archive"}
      </button>
    </form>
  );
}

// ---- Comments (Fulfillment/Outreach/Admin, not Viewer) -----------------------

type CommentWithAuthor = StockCheckComment & { author: Pick<User, "name"> };
type TeamMember = Pick<User, "id" | "name">;

function renderWithMentions(body: string) {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-blue-700">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function StockCommentsSection({
  stockCheckId,
  comments,
  canComment,
  teamMembers,
}: {
  stockCheckId: string;
  comments: CommentWithAuthor[];
  canComment: boolean;
  teamMembers: TeamMember[];
}) {
  const [state, action, pending] = useActionState(addStockComment, undefined);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(comments.length > 0);

  function insertMention(name: string) {
    const firstName = name.split(/\s+/)[0];
    setBody((current) => (current.endsWith(" ") || current === "" ? current : `${current} `) + `@${firstName} `);
    setOpen(true);
  }

  if (!open && comments.length === 0) {
    if (!canComment) return null;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline"
      >
        + Add comment
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {comments.length > 0 && (
        <ul className="space-y-1.5">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
              <p className="whitespace-pre-wrap text-xs text-zinc-700">{renderWithMentions(comment.body)}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {comment.author.name} · {formatDateTime(comment.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canComment && (
        <form action={action} className="space-y-1.5">
          <input type="hidden" name="stockCheckId" value={stockCheckId} />
          <textarea
            name="body"
            required
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. @Camille can we get more of this restocked?"
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs"
          />
          {teamMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member.name)}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-200"
                >
                  @{member.name.split(/\s+/)[0]}
                </button>
              ))}
            </div>
          )}
          <ErrorText error={state?.error} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add comment"}
          </button>
        </form>
      )}
    </div>
  );
}
