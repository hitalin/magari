// 場（ハコ）のページ・出店プラン・お知らせのフォーム検証（純粋関数）。
import { isValidHandle } from "./id";
import { parseMisskeyHost } from "./misskey";

const nullable = (s: string) => (s.trim() ? s.trim() : null);
const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s);
const tooLong = (label: string, s: string, max: number) =>
	s.length > max ? `${label}が長すぎます（${max} 文字まで）` : null;

export type SpaceFormValues = {
	name: string;
	catch: string;
	summary: string;
	body: string;
	facilities: string; // カンマ・読点区切り
	address: string;
	region: string;
	access: string;
	hours: string;
	closedDays: string;
	operator: string;
	url: string;
	xHandle: string;
	misskey: string;
	links: string; // 1 行 1 リンク「ラベル URL」
};

export const EMPTY_SPACE_FORM: SpaceFormValues = {
	name: "",
	catch: "",
	summary: "",
	body: "",
	facilities: "",
	address: "",
	region: "",
	access: "",
	hours: "",
	closedDays: "",
	operator: "",
	url: "",
	xHandle: "",
	misskey: "",
	links: "",
};

export type ParsedSpace = {
	name: string;
	catch: string | null;
	summary: string | null;
	body: string | null;
	facilities: string[];
	address: string | null;
	region: string | null;
	access: string | null;
	hours: string | null;
	closedDays: string | null;
	operator: string | null;
	url: string | null;
	xHandle: string | null;
	// "name@host"
	misskey: string | null;
	links: { label: string; url: string }[];
};

export function readSpaceForm(
	get: (name: string) => string | null,
): SpaceFormValues {
	const out = { ...EMPTY_SPACE_FORM };
	for (const key of Object.keys(out) as (keyof SpaceFormValues)[])
		out[key] = (get(key) ?? "").trim();
	return out;
}

// 「ラベル https://...」か「https://...」の行。URL でない行があれば null
export function parseLinks(
	text: string,
): { label: string; url: string }[] | null {
	const out: { label: string; url: string }[] = [];
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line) continue;
		const parts = line.split(/\s+/);
		const url = parts.pop() ?? "";
		if (!isUrl(url)) return null;
		const label =
			parts.join(" ") || url.replace(/^https?:\/\//, "").replace(/\/$/, "");
		out.push({ label, url });
	}
	return out.slice(0, 20);
}

// 「@foo」「https://x.com/foo」→「foo」
function handleOf(s: string, pattern: RegExp): string | null | false {
	const t = s
		.trim()
		.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i, "")
		.replace(/[/?].*$/, "")
		.replace(/^@/, "");
	if (!t) return null;
	return pattern.test(t) ? t : false;
}

// 「@name@host」「name@host」「https://host/@name」→「name@host」
function misskeyOf(s: string): string | null | false {
	const t = s.trim();
	if (!t) return null;
	const url = t.match(/^https?:\/\/([^/]+)\/@(\w+)\/?$/);
	const [name, host] = url ? [url[2], url[1]] : t.replace(/^@/, "").split("@");
	const h = host ? parseMisskeyHost(host) : null;
	return h && /^\w{1,64}$/.test(name) ? `${name}@${h}` : false;
}

export function parseSpaceForm(
	v: SpaceFormValues,
): { ok: true; values: ParsedSpace } | { ok: false; error: string } {
	if (!v.name) return { ok: false, error: "名前を入れてください" };
	const limits: [string, string, number][] = [
		["名前", v.name, 50],
		["キャッチコピー", v.catch, 100],
		["ひとこと", v.summary, 200],
		["紹介文", v.body, 10000],
		["住所", v.address, 200],
		["都道府県", v.region, 10],
		["アクセス", v.access, 300],
		["営業時間", v.hours, 300],
		["定休日", v.closedDays, 200],
		["運営", v.operator, 100],
	];
	for (const [label, s, max] of limits) {
		const e = tooLong(label, s, max);
		if (e) return { ok: false, error: e };
	}
	if (v.url && !isUrl(v.url))
		return { ok: false, error: "URL は http(s):// から始めてください" };
	const xHandle = handleOf(v.xHandle, /^[A-Za-z0-9_]{1,15}$/);
	if (xHandle === false)
		return { ok: false, error: "X のユーザー名が正しくありません" };
	const misskey = misskeyOf(v.misskey);
	if (misskey === false)
		return {
			ok: false,
			error: "Misskey は @name@misskey.io のようにサーバーまで入れてください",
		};
	const links = parseLinks(v.links);
	if (!links)
		return { ok: false, error: "リンクは 1 行に「名前 https://...」の形で" };
	const facilities = [
		...new Set(
			v.facilities
				.split(/[,、\n]+/)
				.map((t) => t.trim())
				.filter(Boolean),
		),
	].slice(0, 20);
	return {
		ok: true,
		values: {
			name: v.name,
			catch: nullable(v.catch),
			summary: nullable(v.summary),
			body: nullable(v.body),
			facilities,
			address: nullable(v.address),
			region: nullable(v.region),
			access: nullable(v.access),
			hours: nullable(v.hours),
			closedDays: nullable(v.closedDays),
			operator: nullable(v.operator),
			url: nullable(v.url),
			xHandle,
			misskey,
			links,
		},
	};
}

// 場・団体の新規登録
export function parseNewActorForm(
	handle: string,
	name: string,
	kind: string,
):
	| { ok: true; handle: string; name: string; kind: "space" | "group" }
	| { ok: false; error: string } {
	const h = handle.trim().toLowerCase();
	const n = name.trim();
	if (!isValidHandle(h))
		return {
			ok: false,
			error: "ID は小文字の英数字と _ で 3〜20 文字。予約語は使えません",
		};
	if (!n || n.length > 50) return { ok: false, error: "名前は 1〜50 文字" };
	if (kind !== "space" && kind !== "group")
		return { ok: false, error: "種類を選んでください" };
	return { ok: true, handle: h, name: n, kind };
}
