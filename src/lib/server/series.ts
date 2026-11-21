import { and, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import { RRule } from "rrule";
import { statusAfterEdit } from "#lib/event-form.ts";
import { shortId } from "#lib/id.ts";
import { moveToDay } from "#lib/repeat.ts";
import type { Db } from "./db/index.ts";
import { eventHosts, eventSeries, events } from "./db/schema.ts";
import type { EventValues } from "./me.ts";

// 繰り返しの間。回は 1 つずつ実体の会（events）として作り、series_id でつなぐ。
// 決まりにあるのは「繰り返しの中の回は、日付のほかは同じ内容」。1 回だけ直した回は繰り返しから外す（series_id を消す）。
// だから先の回を足すときは、いちばん先の回を写せばよく、雛形を別に持たない。

const DAY = 86_400_000;
const JST = 9 * 3_600_000;
// 何日先の回まで作っておくか
const AHEAD = 90 * DAY;

// dtstart の回から決まりどおりに数えて、after より後・until までの回を返す。
// rrule は UTC で計算するので、JST の壁時計を UTC に見立てて数え、最後に戻す（取り込みの normalize.ts と同じ）
export function occurrencesAfter(
	rrule: string,
	dtstart: Date,
	after: Date,
	until: Date,
): Date[] {
	const float = (d: Date) => new Date(d.getTime() + JST);
	const rule = new RRule({
		...RRule.parseString(rrule),
		dtstart: float(dtstart),
	});
	return rule
		.between(float(after), float(until), false)
		.map((d) => new Date(d.getTime() - JST));
}

// どこまでの回を作るか。作っておく先（horizon）か、繰り返しの終わりの、手前のほう
export function expandLimit(horizon: Date, until: Date | null): Date {
	return until && until < horizon ? until : horizon;
}

// 先の回を AHEAD（か、繰り返しの終わり）まで足す。回が 1 つも残っていない繰り返しは終える。足した数を返す
export async function extendSeries(
	db: Db,
	seriesId: string,
	now = new Date(),
): Promise<number> {
	const [series] = await db
		.select()
		.from(eventSeries)
		.where(eq(eventSeries.id, seriesId))
		.limit(1);
	if (!series) return 0;
	const [last] = await db
		.select()
		.from(events)
		.where(eq(events.seriesId, seriesId))
		.orderBy(desc(events.startsAt))
		.limit(1);
	if (!last) {
		await db.delete(eventSeries).where(eq(eventSeries.id, seriesId));
		return 0;
	}
	const until = expandLimit(new Date(now.getTime() + AHEAD), series.until);
	// 前に作った所まではもう数えない（消された回を作り直さないため）
	const after =
		series.expandedUntil && series.expandedUntil > last.startsAt
			? series.expandedUntil
			: last.startsAt;
	const dates = occurrencesAfter(series.rrule, last.startsAt, after, until);
	const hosts = dates.length
		? await db.select().from(eventHosts).where(eq(eventHosts.eventId, last.id))
		: [];
	for (const startsAt of dates) {
		const id = shortId();
		await db.batch([
			db.insert(events).values({
				...last,
				id,
				startsAt,
				endsAt:
					last.endsAt &&
					new Date(
						startsAt.getTime() +
							last.endsAt.getTime() -
							last.startsAt.getTime(),
					),
				// 中止は回ごとのもの。写した先の回は開く
				status: last.status === "cancelled" ? "published" : last.status,
				createdAt: now,
				updatedAt: now,
			}),
			...hosts.map((h) => db.insert(eventHosts).values({ ...h, eventId: id })),
		]);
	}
	await db
		.update(eventSeries)
		.set({ expandedUntil: until })
		.where(eq(eventSeries.id, seriesId));
	return dates.length;
}

// 会を繰り返しの最初の回にして、先の回を作る。until は繰り返しの終わり（parseUntil。無ければ、やめるまで続く）
export async function startSeries(
	db: Db,
	eventId: string,
	rrule: string,
	until: Date | null = null,
): Promise<void> {
	const [series] = await db
		.insert(eventSeries)
		.values({ rrule, until })
		.returning({ id: eventSeries.id });
	await db
		.update(events)
		.set({ seriesId: series.id })
		.where(eq(events.id, eventId));
	await extendSeries(db, series.id);
}

// Cron から。先の回が足りなくなった繰り返しを延ばす（1 つの繰り返しにつき、1 日に 1 度まで）
export async function extendDueSeries(
	db: Db,
	now = new Date(),
): Promise<{ series: number; added: number }> {
	const due = await db
		.select({ id: eventSeries.id })
		.from(eventSeries)
		.where(
			or(
				isNull(eventSeries.expandedUntil),
				and(
					lt(eventSeries.expandedUntil, new Date(now.getTime() + AHEAD - DAY)),
					// 終わりの日まで作り終えた繰り返しは、もう延ばさない
					or(
						isNull(eventSeries.until),
						lt(eventSeries.expandedUntil, eventSeries.until),
					),
				),
			),
		)
		.limit(20);
	let added = 0;
	for (const s of due) added += await extendSeries(db, s.id, now);
	return { series: due.length, added };
}

type Occurrence = { seriesId: string | null; startsAt: Date };

const following = (ev: Occurrence & { seriesId: string }) =>
	and(eq(events.seriesId, ev.seriesId), gte(events.startsAt, ev.startsAt));

// この回から先の回を、同じ内容に直す。日付は回ごとのまま、時刻と長さだけ写す。中止した回は中止のまま
export async function updateFollowing(
	db: Db,
	ev: Occurrence & { seriesId: string },
	input: EventValues,
): Promise<string[]> {
	const rows = await db
		.select({
			id: events.id,
			startsAt: events.startsAt,
			status: events.status,
		})
		.from(events)
		.where(following(ev));
	const { status, startsAt, endsAt, ...rest } = input;
	const stmts = rows.map((r) =>
		db
			.update(events)
			.set({
				...rest,
				...moveToDay(r.startsAt, startsAt, endsAt),
				status: statusAfterEdit(r.status, status),
				updatedAt: new Date(),
			})
			.where(eq(events.id, r.id)),
	);
	if (stmts.length)
		await db.batch(stmts as [(typeof stmts)[number], ...typeof stmts]);
	return rows.map((r) => r.id);
}

// この回から先の回を消して、繰り返しを終える（前の回は単発の会として残る）。消した会を返す
export async function deleteFollowing(
	db: Db,
	ev: Occurrence & { seriesId: string },
): Promise<{ id: string; coverKey: string | null }[]> {
	const gone = await db
		.delete(events)
		.where(following(ev))
		.returning({ id: events.id, coverKey: events.coverKey });
	await db
		.update(events)
		.set({ seriesId: null })
		.where(eq(events.seriesId, ev.seriesId));
	await db.delete(eventSeries).where(eq(eventSeries.id, ev.seriesId));
	return gone;
}

// 繰り返しの終わりの日を決め直す。手前にしたら、その日より後の回を消す（消した会を返す）。
// 先へ延ばすか、終わりを無くしたら、足りない回を作る
export async function setSeriesUntil(
	db: Db,
	seriesId: string,
	until: Date | null,
): Promise<{ id: string; coverKey: string | null }[]> {
	const [series] = await db
		.select({ expandedUntil: eventSeries.expandedUntil })
		.from(eventSeries)
		.where(eq(eventSeries.id, seriesId))
		.limit(1);
	if (!series) return [];
	const gone = until
		? await db
				.delete(events)
				.where(and(eq(events.seriesId, seriesId), gte(events.startsAt, until)))
				.returning({ id: events.id, coverKey: events.coverKey })
		: [];
	await db
		.update(eventSeries)
		.set({
			until,
			// 消した所から先は「まだ作っていない」に戻す（あとで終わりを延ばしたとき、そこから作れるように）
			expandedUntil:
				until && series.expandedUntil && series.expandedUntil > until
					? until
					: series.expandedUntil,
		})
		.where(eq(eventSeries.id, seriesId));
	await extendSeries(db, seriesId);
	return gone;
}

// 繰り返しの回は同じフライヤー（R2 の同じキー）を指す。ほかの会がまだ使っているなら R2 からは消さない
export async function flyerInUse(db: Db, coverKey: string): Promise<boolean> {
	const [row] = await db
		.select({ id: events.id })
		.from(events)
		.where(eq(events.coverKey, coverKey))
		.limit(1);
	return !!row;
}
