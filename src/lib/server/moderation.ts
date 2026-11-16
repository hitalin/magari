// 運営への連絡（reports）と掲載拒否リスト（blocked_handles）の読み書き。
import { asc, desc, eq } from "drizzle-orm";
import type { ParsedReport } from "#lib/report-form.ts";
import type { Db } from "./db/index.ts";
import { blockedHandles, reports } from "./db/schema.ts";

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
