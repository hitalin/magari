import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// 一覧は /events に移した。前の URL（ブックマーク、入れてある PWA の起動先、貼られたリンク）から送る
export const GET: RequestHandler = ({ url }) =>
	redirect(301, `/events${url.search}`);
