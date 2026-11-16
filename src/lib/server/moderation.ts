// 運営への連絡（reports）、運営による非表示（hidden_at）、掲載拒否リスト（blocked_handles）の読み書き。
import { asc, desc, eq, isNotNull } from "drizzle-orm";
import type { ModerationTarget, ParsedReport } from "#lib/report-form.ts";
import type { Db } from "./db/index.ts";
import { actors, blockedHandles, events, reports } from "./db/schema.ts";

export async function createReport(db: Db, values: ParsedReport) {
	await db.insert(reports).values(values);
}

export type Report = typeof reports.$inferSelect;

export async function listReports(db: Db): Promise<Report[]> {
	return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(200);
}

export async function deleteReport(db: Db, id: string) {
	await db.delete(reports).where(eq(reports.id, id));
}

// 対応の記録を残す（いつ、何をしたか）。連絡そのものは消さない
export async function markReportHandled(
	db: Db,
	id: string,
	note: string | null,
) {
	await db
		.update(reports)
		.set({ handledAt: new Date(), note })
		.where(eq(reports.id, id));
}

// 運営に連絡が届いたことを知らせる（Discord / Slack などの Webhook）。
// 外のサービスに送るので、送るのは種別と対象だけ。名前・返信先・本文は送らない
export async function notifyOperator(
	webhookUrl: string | undefined,
	origin: string,
	report: Pick<ParsedReport, "kind" | "about">,
): Promise<void> {
	if (!webhookUrl) return;
	const text = `まがりに連絡が届きました（${report.kind}${report.about ? `: ${report.about}` : ""}）\n${origin}/admin/reports`;
	try {
		const res = await fetch(webhookUrl, {
			method: "POST",
			headers: { "content-type": "application/json" },
			// Discord は content、Slack は text を読む
			body: JSON.stringify({ content: text, text }),
		});
		if (!res.ok) console.error(`notifyOperator: HTTP ${res.status}`);
	} catch (e) {
		// 通知が失敗しても、連絡そのものは受け付ける（/admin/reports には残っている）
		console.error(`notifyOperator: ${e}`);
	}
}

// 運営による非表示。消さずに隠す（申し出があればまず隠し、あとで判断する）。
// 対象が無ければ false
export async function setHidden(
	db: Db,
	target: ModerationTarget,
	hidden: boolean,
): Promise<boolean> {
	const hiddenAt = hidden ? new Date() : null;
	const rows =
		target.type === "actor"
			? await db
					.update(actors)
					.set({ hiddenAt })
					.where(eq(actors.handle, target.handle))
					.returning({ id: actors.id })
			: await db
					.update(events)
					.set({ hiddenAt })
					.where(eq(events.id, target.id))
					.returning({ id: events.id });
	return rows.length > 0;
}

export type HiddenItem = {
	target: string; // 「@handle」か会の ID
	label: string;
	hiddenAt: Date;
};

export async function listHidden(db: Db): Promise<HiddenItem[]> {
	const [a, e] = await Promise.all([
		db
			.select({
				handle: actors.handle,
				name: actors.name,
				hiddenAt: actors.hiddenAt,
			})
			.from(actors)
			.where(isNotNull(actors.hiddenAt)),
		db
			.select({ id: events.id, title: events.title, hiddenAt: events.hiddenAt })
			.from(events)
			.where(isNotNull(events.hiddenAt)),
	]);
	return [
		...a.map((r) => ({
			target: `@${r.handle}`,
			label: r.name,
			hiddenAt: r.hiddenAt as Date,
		})),
		...e.map((r) => ({
			target: r.id,
			label: r.title,
			hiddenAt: r.hiddenAt as Date,
		})),
	].sort((x, y) => y.hiddenAt.getTime() - x.hiddenAt.getTime());
}

export async function isBlockedHandle(
	db: Db,
	handle: string,
): Promise<boolean> {
	const [row] = await db
		.select({ handle: blockedHandles.handle })
		.from(blockedHandles)
		.where(eq(blockedHandles.handle, handle))
		.limit(1);
	return row !== undefined;
}

export type BlockedHandle = typeof blockedHandles.$inferSelect;

export async function listBlockedHandles(db: Db): Promise<BlockedHandle[]> {
	return db.select().from(blockedHandles).orderBy(asc(blockedHandles.handle));
}

export async function blockHandle(db: Db, handle: string, note: string | null) {
	await db
		.insert(blockedHandles)
		.values({ handle, note })
		.onConflictDoUpdate({ target: blockedHandles.handle, set: { note } });
}

export async function unblockHandle(db: Db, handle: string) {
	await db.delete(blockedHandles).where(eq(blockedHandles.handle, handle));
}
