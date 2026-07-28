import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canConfirmAddressUpdated, canConfirmGiftNoteAdded, canEditException, getCurrentUser } from "@/lib/dal";
import { AgingFlag, ExceptionTypeBadge, StageBadge } from "@/components/badges";
import { RESOLUTION_TYPE_LABELS, isAddressUpdateType, isGiftNoteType, showsCarrierClaim } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import {
  AdminEditForm,
  CarrierClaimForm,
  CloseNoResponseForm,
  CommentsSection,
  ConfirmResolvedForm,
  CorrectedAddressForm,
  FulfillmentFieldsForm,
  GiftNoteInvoicePaidControl,
  GiftNoteTextForm,
  MarkAddressUpdatedForm,
  MarkFulfilledForm,
  MarkGiftNoteAddedForm,
  MarkOutreachSentForm,
  OutreachNotesForm,
  RecordResponseForm,
  StageEditorForm,
} from "./forms";

export const dynamic = "force-dynamic";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const exception = await db.exception.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      lastUpdatedBy: { select: { name: true } },
      confirmedResolvedBy: { select: { name: true } },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!exception) notFound();

  const [siblings, teamMembers] = await Promise.all([
    db.exception.findMany({
      where: { orderNumber: exception.orderNumber, id: { not: exception.id } },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Anyone (Camille, Mary, Emilie) can create/edit exceptions and change the
  // stage directly — the guided buttons below just capture the right fields
  // for the common transitions; eligibility depends on the current stage,
  // not on who's logged in.
  const canEdit = canEditException(user.role);
  const isAddressUpdate = isAddressUpdateType(exception.exceptionType);
  const isGiftNote = isGiftNoteType(exception.exceptionType);
  const skipsOutreach = isAddressUpdate || isGiftNote;
  const canRecordResponse =
    canEdit && !skipsOutreach && (exception.stage === "LOGGED" || exception.stage === "OUTREACH_SENT");
  const canMarkFulfilled =
    canEdit &&
    !skipsOutreach &&
    (exception.stage === "READY_FOR_FULFILLMENT" ||
      (exception.stage === "CUSTOMER_RESPONDED" && user.role === "ADMIN"));
  const canMarkAddressUpdated =
    canConfirmAddressUpdated(user.role) &&
    isAddressUpdate &&
    exception.stage === "LOGGED" &&
    Boolean(exception.correctedAddress);
  const canMarkGiftNoteAdded = canConfirmGiftNoteAdded(user.role) && isGiftNote && exception.stage === "LOGGED";
  const canConfirm =
    exception.stage === "FULFILLED" ||
    (exception.stage === "CUSTOMER_RESPONDED" &&
      (exception.resolutionType === "REFUNDED" || exception.resolutionType === "OTHER"));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/exceptions" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to exceptions
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Order #{exception.orderNumber} — {exception.productName}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <ExceptionTypeBadge type={exception.exceptionType} />
              <StageBadge stage={exception.stage} />
              <AgingFlag stageChangedAt={exception.stageChangedAt} stage={exception.stage} />
            </div>
          </div>
        </div>
        {canEdit && exception.stage !== "CONFIRMED_RESOLVED" && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
            <StageEditorForm exception={exception} />
          </div>
        )}
      </div>

      {siblings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">
            This order has {siblings.length} other exception{siblings.length > 1 ? "s" : ""}:
          </p>
          <ul className="mt-1 space-y-1">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link href={`/exceptions/${s.id}`} className="text-amber-800 underline">
                  {s.productName}
                </Link>{" "}
                <span className="text-amber-700">— {s.stage.replace(/_/g, " ").toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Fulfillment details</h2>
          {canEdit ? (
            <FulfillmentFieldsForm exception={exception} />
          ) : (
            exception.fulfillmentNotes && (
              <p className="text-sm text-zinc-600">{exception.fulfillmentNotes}</p>
            )
          )}
          <div className="border-t border-zinc-100 pt-3">
            {isGiftNote ? (
              <div className="space-y-3">
                {canEdit ? (
                  <GiftNoteTextForm exception={exception} />
                ) : exception.giftNoteText ? (
                  <div className="text-sm text-zinc-600">
                    <p className="font-medium">Gift note copy:</p>
                    <p className="whitespace-pre-wrap">{exception.giftNoteText}</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">No gift note text saved yet.</p>
                )}
                {canEdit && <GiftNoteInvoicePaidControl exception={exception} />}
                <div className="border-t border-zinc-100 pt-3">
                  {canMarkGiftNoteAdded ? (
                    <MarkGiftNoteAddedForm exceptionId={exception.id} />
                  ) : exception.stage !== "LOGGED" ? (
                    <p className="text-sm text-emerald-700">✓ Added to the order.</p>
                  ) : (
                    <p className="text-sm text-zinc-400">Waiting on Camille to confirm it&apos;s been added to the order.</p>
                  )}
                </div>
              </div>
            ) : isAddressUpdate ? (
              exception.stage === "LOGGED" ? (
                <div className="space-y-3">
                  {canEdit ? (
                    <CorrectedAddressForm exception={exception} />
                  ) : exception.correctedAddress ? (
                    <div className="text-sm text-zinc-600">
                      <p className="font-medium">Corrected address:</p>
                      <p className="whitespace-pre-wrap">{exception.correctedAddress}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">No corrected address saved yet.</p>
                  )}
                  <div className="border-t border-zinc-100 pt-3">
                    {canMarkAddressUpdated ? (
                      <MarkAddressUpdatedForm exceptionId={exception.id} />
                    ) : exception.correctedAddress ? (
                      <p className="text-sm text-zinc-400">Waiting on Camille to update it in ShipStation.</p>
                    ) : (
                      <p className="text-sm text-zinc-400">
                        Waiting on the corrected address before Camille can update ShipStation.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">
                  <p className="font-medium">Corrected address:</p>
                  <p className="whitespace-pre-wrap">{exception.correctedAddress}</p>
                  {exception.trackingNumber && (
                    <p className="mt-2">
                      Shipped: <span className="font-medium">{exception.trackingNumber}</span>
                      {exception.carrier ? ` (${exception.carrier})` : ""}
                    </p>
                  )}
                </div>
              )
            ) : canMarkFulfilled ? (
              <MarkFulfilledForm exceptionId={exception.id} />
            ) : exception.trackingNumber ? (
              <div className="text-sm text-zinc-600">
                <p>
                  Shipped: <span className="font-medium">{exception.trackingNumber}</span>
                  {exception.carrier ? ` (${exception.carrier})` : ""}
                </p>
                {exception.shippedAt && (
                  <p className="text-xs text-zinc-400">
                    {formatDateTime(exception.shippedAt)}
                  </p>
                )}
              </div>
            ) : exception.stage === "READY_FOR_FULFILLMENT" ? (
              <p className="text-sm text-zinc-400">Waiting on Camille to fulfill.</p>
            ) : exception.resolutionType && exception.resolutionType !== "REPLACEMENT_SHIPPED" ? (
              <p className="text-sm text-zinc-500">
                Resolved via {RESOLUTION_TYPE_LABELS[exception.resolutionType]} — no shipment needed.
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                Nothing to ship yet — waiting on outreach / customer response.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Customer outreach</h2>
          {isAddressUpdate ? (
            <p className="text-sm text-zinc-400">
              Not needed for address updates — the corrected address comes straight from the customer
              when this is logged.
            </p>
          ) : isGiftNote ? (
            <p className="text-sm text-zinc-400">
              Not needed for gift notes — Mary already has the note text and fee from the customer
              when this is logged.
            </p>
          ) : (
            <>
              {canEdit ? (
                <OutreachNotesForm exception={exception} />
              ) : (
                exception.outreachNotes && <p className="text-sm text-zinc-600">{exception.outreachNotes}</p>
              )}
              <div className="space-y-3 border-t border-zinc-100 pt-3">
                {canEdit && exception.stage === "LOGGED" && <MarkOutreachSentForm exceptionId={exception.id} />}
                {canRecordResponse && <RecordResponseForm exceptionId={exception.id} />}
                {exception.customerChoice && (
                  <p className="text-sm text-zinc-600">
                    <span className="font-medium">Customer chose:</span> {exception.customerChoice}
                    {exception.resolutionType && (
                      <span className="text-zinc-400"> ({RESOLUTION_TYPE_LABELS[exception.resolutionType]})</span>
                    )}
                  </p>
                )}
                {canRecordResponse && <CloseNoResponseForm exceptionId={exception.id} />}
              </div>
            </>
          )}
        </section>
      </div>

      {showsCarrierClaim(exception.exceptionType) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">Carrier claim</h2>
          <p className="text-xs text-zinc-500">
            Independent of the resolution above — for recovering cost from UPS/FedEx/etc., separate from
            making the customer whole.
          </p>
          {canEdit ? (
            <CarrierClaimForm exception={exception} />
          ) : (
            <p className="text-sm text-zinc-600">
              {exception.carrierClaimFiledAt
                ? `Filed${exception.carrierClaimReference ? ` (ref: ${exception.carrierClaimReference})` : ""}`
                : "Not filed yet."}
            </p>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-sm font-semibold text-emerald-900">Resolution confirmation (Admin)</h2>
        {exception.confirmedResolvedAt ? (
          <p className="text-sm text-emerald-800">
            Confirmed resolved by {exception.confirmedResolvedBy?.name} on{" "}
            {formatDateTime(exception.confirmedResolvedAt)}.
          </p>
        ) : canConfirm && user.role === "ADMIN" ? (
          <ConfirmResolvedForm exceptionId={exception.id} />
        ) : canConfirm ? (
          <p className="text-sm text-emerald-800">
            Ready for Emilie to confirm the corrected order actually went out correctly.
          </p>
        ) : (
          <p className="text-sm text-emerald-700">
            Not resolved yet — waiting on outreach, customer response, or fulfillment.
          </p>
        )}
      </section>

      {user.role === "ADMIN" && (
        <details className="rounded-lg border border-red-200 bg-red-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-red-900">
            Admin: edit any field / correct a mistake
          </summary>
          <div className="mt-3">
            <AdminEditForm exception={exception} />
          </div>
        </details>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Comments</h2>
        <p className="text-xs text-zinc-500">
          Tracking updates, replacement requests, or anything else worth recording for each other.
          Type @Name to notify someone directly.
        </p>
        <CommentsSection
          exceptionId={exception.id}
          comments={exception.comments}
          canComment={canEdit}
          teamMembers={teamMembers}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Activity history</h2>
        <p className="text-xs text-zinc-500">
          Created by {exception.createdBy.name} on {formatDateTime(exception.createdAt)}
          {exception.lastUpdatedBy && (
            <> · last updated by {exception.lastUpdatedBy.name} on {formatDateTime(exception.updatedAt)}</>
          )}
        </p>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {exception.events.map((event) => (
            <li key={event.id} className="p-3 text-sm">
              <p className="text-zinc-700">{event.action}</p>
              <p className="text-xs text-zinc-400">
                {event.actor.name} · {formatDateTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
