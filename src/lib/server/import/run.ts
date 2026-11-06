import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { detectArea, ONLINE } from "#lib/area.ts";
import type { Db } from "../db/index.ts";
import { actors, eventHosts, events } from "../db/schema.ts";
import { fetchFreecalend, freecalendMemNo } from "./freecalend";
import { type IcsCalendar, parseIcs } from "./ics";
import {
	expandOccurrences,
	parseEdenTitle,
	storeHoursFor,
	unwrapUrl,
} from "./normalize";
import { SOURCES, type Source } from "./sources";

const DAY_MS = 86_400_000;
const ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

// 取り込み元 + UID + 回から決まる ID。再取り込みで同じ会が同じ ID になる。
async function stableId(key: string): Promise<string> {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(key),
	);
	return [...new Uint8Array(buf).slice(0, 10)]
		.map((b) => ID_ALPHABET[b % ID_ALPHABET.length])
		.join("");
}

type Row = typeof events.$inferInsert;

// 公開 iCal か、フリカレ（freecalend.com）か
async function fetchCalendar(
	url: string,
	from: Date,
	to: Date,
): Promise<IcsCalendar> {
	if (freecalendMemNo(url)) return fetchFreecalend(url, from, to);
	const res = await fetch(url, {
		headers: { "user-agent": "magari.cc importer" },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return parseIcs(await res.text());
}

async function upsertActor(db: Db, src: Source): Promise<string> {
	const a = src.actor;
	const [row] = await db
		.insert(actors)
		.values({
			handle: a.handle,
			kind: a.kind,
			name: a.name,
			summary: a.summary,
			url: a.url,
			xHandle: a.xHandle ?? null,
		})
		.onConflictDoUpdate({
			target: actors.handle,
			set: {
				name: a.name,
				summary: a.summary,
				url: a.url,
				xHandle: a.xHandle ?? null,
				updatedAt: new Date(),
			},
		})
		.returning({ id: actors.id });
	return row.id;
}

export type ImportResult = {
	source: string;
	calendar: string;
	fetched: number;
	upserted: number;
	deleted: number;
	error?: string;
};

async function importCalendar(
	db: Db,
	src: Source,
	cal: Source["calendars"][number],
	actorId: string,
	from: Date,
	to: Date,
): Promise<ImportResult> {
	const sourceKey = `${src.id}/${cal.id}`;
	const parsed = await fetchCalendar(cal.url, from, to);

	// RECURRENCE-ID 付きは個別回の上書き。生成した回と衝突したら上書き側を採用する。
	const overridden = new Set(
		parsed.events
			.filter((e) => e.recurrenceId)
			.map((e) => `${e.uid}:${e.recurrenceId?.toISOString()}`),
	);
	const now = new Date();
	const rows: Row[] = [];
	const hostRows: { eventId: string }[] = [];

	for (const ev of parsed.events) {
		for (const occ of expandOccurrences(ev, from, to)) {
			if (
				!ev.recurrenceId &&
				ev.rrule &&
				overridden.has(`${ev.uid}:${occ.occurrenceKey}`)
			)
				continue;
			let title = ev.summary;
			let start = occ.start;
			let end = occ.end;
			let allDay = ev.allDay;
			const tags = [...src.tags];
			if (src.id.startsWith("eden")) {
				const t = parseEdenTitle(ev.summary, occ.start);
				title = t.title;
				if (t.start) {
					start = t.start;
					end = t.end;
					allDay = false;
				}
				if (/空いて(い)?ます|空き/.test(title)) tags.push("空き枠");
			}
			// 時刻の無い 1 日の会は店の営業時間に置く（複数日にまたがる会は終日のまま）
			if (
				allDay &&
				src.storeHours &&
				end &&
				end.getTime() - start.getTime() === DAY_MS
			) {
				const h = storeHoursFor(title, start, src.storeHours);
				if (h) {
					start = h.start;
					end = h.end;
					allDay = false;
				}
			}
			if (cal.region) tags.push(cal.region);
			if (
				cal.region === "オンライン" ||
				/オンライン|zoom/i.test(ev.location ?? "")
			) {
				if (!tags.includes("オンライン")) tags.push("オンライン");
			}
			// 場のエリア > 会場文字列の都道府県 > カレンダーの地域（近畿など、粗い単位）
			const area =
				src.area ??
				(cal.region === ONLINE
					? ONLINE
					: (detectArea(ev.location) ?? cal.region ?? null));
			const id = await stableId(`${sourceKey}:${ev.uid}:${occ.occurrenceKey}`);
			rows.push({
				id,
				title: title.slice(0, 200),
				description:
					ev.description && !/^<a href/.test(ev.description)
						? ev.description.replace(/<[^>]+>/g, "").slice(0, 4000)
						: null,
				startsAt: start,
				endsAt: end,
				allDay,
				status: ev.cancelled ? "cancelled" : "published",
				visibility: "public",
				spaceActorId: src.role === "space" ? actorId : null,
				area,
				locationName: ev.location?.slice(0, 200) ?? null,
				url: unwrapUrl(ev.description),
				tags,
				source: sourceKey,
				sourceUid: ev.uid,
				updatedAt: now,
			});
			if (src.role === "host") hostRows.push({ eventId: id });
		}
	}

	// D1 は 1 文の bind 変数が 100 までなので、1 行ずつの upsert を batch で送る
	const CHUNK = 50;
	for (let i = 0; i < rows.length; i += CHUNK) {
		const chunk = rows.slice(i, i + CHUNK);
		const stmts = chunk.map((r) =>
			db
				.insert(events)
				.values(r)
				.onConflictDoUpdate({
					target: events.id,
					set: {
						title: r.title,
						description: r.description,
						startsAt: r.startsAt,
						endsAt: r.endsAt,
						allDay: r.allDay,
						status: r.status,
						spaceActorId: r.spaceActorId,
						area: r.area,
						locationName: r.locationName,
						url: r.url,
						tags: r.tags,
						updatedAt: now,
					},
				}),
		);
		await db.batch(stmts as [(typeof stmts)[number], ...typeof stmts]);
	}
	for (let i = 0; i < hostRows.length; i += CHUNK) {
		const stmts = hostRows
			.slice(i, i + CHUNK)
			.map((h) =>
				db
					.insert(eventHosts)
					.values({ eventId: h.eventId, actorId, role: "host" })
					.onConflictDoNothing(),
			);
		await db.batch(stmts as [(typeof stmts)[number], ...typeof stmts]);
	}

	// 元のカレンダーから消えた会を消す（範囲内・この取り込み元のものだけ）
	const keep = new Set(rows.map((r) => r.id as string));
	const existing = await db
		.select({ id: events.id })
		.from(events)
		.where(
			and(
				eq(events.source, sourceKey),
				gte(events.startsAt, from),
				lt(events.startsAt, to),
			),
		);
	const stale = existing.map((e) => e.id).filter((id) => !keep.has(id));
	for (let i = 0; i < stale.length; i += 90) {
		await db.delete(events).where(inArray(events.id, stale.slice(i, i + 90)));
	}

	return {
		source: src.id,
		calendar: cal.id,
		fetched: parsed.events.length,
		upserted: rows.length,
		deleted: stale.length,
	};
}

export async function runImports(
	db: Db,
	opts: { pastDays?: number; futureDays?: number } = {},
): Promise<ImportResult[]> {
	const now = Date.now();
	const from = new Date(now - (opts.pastDays ?? 1) * DAY_MS);
	const to = new Date(now + (opts.futureDays ?? 120) * DAY_MS);
	const results: ImportResult[] = [];
	for (const src of SOURCES) {
		const actorId = await upsertActor(db, src);
		for (const cal of src.calendars) {
			try {
				results.push(await importCalendar(db, src, cal, actorId, from, to));
			} catch (e) {
				results.push({
					source: src.id,
					calendar: cal.id,
					fetched: 0,
					upserted: 0,
					deleted: 0,
					error: String(e),
				});
			}
		}
	}
	return results;
}
