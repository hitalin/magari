// 場（ハコ）のページ・出店プラン・お知らせ・問い合わせのフォーム検証（純粋関数）。
import { isValidHandle } from './id';

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
	instagram: string;
	links: string; // 1 行 1 リンク「ラベル URL」
};

export const EMPTY_SPACE_FORM: SpaceFormValues = {
	name: '',
	catch: '',
	summary: '',
	body: '',
	facilities: '',
	address: '',
	region: '',
	access: '',
	hours: '',
	closedDays: '',
	operator: '',
	url: '',
	xHandle: '',
	instagram: '',
	links: ''
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
	instagram: string | null;
	links: { label: string; url: string }[];
};

export function readSpaceForm(get: (name: string) => string | null): SpaceFormValues {
	const out = { ...EMPTY_SPACE_FORM };
	for (const key of Object.keys(out) as (keyof SpaceFormValues)[])
		out[key] = (get(key) ?? '').trim();
	return out;
}

// 「ラベル https://...」か「https://...」の行。URL でない行があれば null
export function parseLinks(text: string): { label: string; url: string }[] | null {
	const out: { label: string; url: string }[] = [];
	for (const raw of text.split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		const parts = line.split(/\s+/);
		const url = parts.pop() ?? '';
		if (!isUrl(url)) return null;
		const label = parts.join(' ') || url.replace(/^https?:\/\//, '').replace(/\/$/, '');
		out.push({ label, url });
	}
	return out.slice(0, 20);
}

// 「@foo」「https://x.com/foo」→「foo」
function handleOf(s: string, pattern: RegExp): string | null | false {
	const t = s
		.trim()
		.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|instagram\.com)\//i, '')
		.replace(/[/?].*$/, '')
		.replace(/^@/, '');
	if (!t) return null;
	return pattern.test(t) ? t : false;
}

export function parseSpaceForm(
	v: SpaceFormValues
): { ok: true; values: ParsedSpace } | { ok: false; error: string } {
	if (!v.name) return { ok: false, error: '名前を入れてください' };
	const limits: [string, string, number][] = [
		['名前', v.name, 50],
		['キャッチコピー', v.catch, 100],
		['ひとこと', v.summary, 200],
		['紹介文', v.body, 10000],
		['住所', v.address, 200],
		['都道府県', v.region, 10],
		['アクセス', v.access, 300],
		['営業時間', v.hours, 300],
		['定休日', v.closedDays, 200],
		['運営', v.operator, 100]
	];
	for (const [label, s, max] of limits) {
		const e = tooLong(label, s, max);
		if (e) return { ok: false, error: e };
	}
	if (v.url && !isUrl(v.url)) return { ok: false, error: 'URL は http(s):// から始めてください' };
	const xHandle = handleOf(v.xHandle, /^[A-Za-z0-9_]{1,15}$/);
	if (xHandle === false) return { ok: false, error: 'X のユーザー名が正しくありません' };
	const instagram = handleOf(v.instagram, /^[A-Za-z0-9._]{1,30}$/);
	if (instagram === false) return { ok: false, error: 'Instagram のユーザー名が正しくありません' };
	const links = parseLinks(v.links);
	if (!links) return { ok: false, error: 'リンクは 1 行に「名前 https://...」の形で' };
	const facilities = [
		...new Set(
			v.facilities
				.split(/[,、\n]+/)
				.map((t) => t.trim())
				.filter(Boolean)
		)
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
			instagram,
			links
		}
	};
}

export const PLAN_KINDS = ['spot', 'weekly', 'exclusive', 'other'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];
export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
	spot: '時間帯で借りる',
	weekly: '曜日固定',
	exclusive: '貸し切り',
	other: 'その他'
};

export type PlanFormValues = { name: string; kind: string; priceText: string; description: string };
export type ParsedPlan = {
	name: string;
	kind: PlanKind;
	priceText: string | null;
	description: string | null;
};

export function parsePlanForm(
	v: PlanFormValues
): { ok: true; values: ParsedPlan } | { ok: false; error: string } {
	const name = v.name.trim();
	if (!name) return { ok: false, error: 'プラン名を入れてください' };
	for (const [label, s, max] of [
		['プラン名', name, 50],
		['料金', v.priceText, 2000],
		['説明', v.description, 5000]
	] as const) {
		const e = tooLong(label, s, max);
		if (e) return { ok: false, error: e };
	}
	const kind = (PLAN_KINDS as readonly string[]).includes(v.kind) ? (v.kind as PlanKind) : 'other';
	return {
		ok: true,
		values: { name, kind, priceText: nullable(v.priceText), description: nullable(v.description) }
	};
}

export type PostFormValues = { title: string; body: string };

export function parsePostForm(
	v: PostFormValues
): { ok: true; values: { title: string; body: string | null } } | { ok: false; error: string } {
	const title = v.title.trim();
	if (!title) return { ok: false, error: '題を入れてください' };
	const e = tooLong('題', title, 100) ?? tooLong('本文', v.body, 10000);
	if (e) return { ok: false, error: e };
	return { ok: true, values: { title, body: nullable(v.body) } };
}

export const INQUIRY_KINDS = ['rental', 'event', 'visit', 'press', 'other'] as const;
export type InquiryKind = (typeof INQUIRY_KINDS)[number];
export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = {
	rental: '出店・間借りの相談',
	event: 'イベント利用の相談',
	visit: 'ご来店について',
	press: '取材・掲載のご依頼',
	other: 'その他'
};

export type InquiryFormValues = {
	kind: string;
	name: string;
	email: string;
	phone: string;
	body: string;
	website: string; // ハニーポット。人は入力しない
};
export type ParsedInquiry = {
	kind: InquiryKind;
	name: string;
	email: string;
	phone: string | null;
	body: string;
};

export function parseInquiryForm(
	v: InquiryFormValues
): { ok: true; values: ParsedInquiry } | { ok: false; error: string } {
	if (v.website.trim()) return { ok: false, error: 'bot' };
	const name = v.name.trim();
	const email = v.email.trim();
	const body = v.body.trim();
	if (!name) return { ok: false, error: 'お名前を入れてください' };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		return { ok: false, error: 'メールアドレスが正しくありません' };
	if (!body) return { ok: false, error: '内容を入れてください' };
	const e =
		tooLong('お名前', name, 50) ??
		tooLong('メールアドレス', email, 200) ??
		tooLong('電話番号', v.phone, 30) ??
		tooLong('内容', body, 5000);
	if (e) return { ok: false, error: e };
	const kind = (INQUIRY_KINDS as readonly string[]).includes(v.kind)
		? (v.kind as InquiryKind)
		: 'other';
	return { ok: true, values: { kind, name, email, phone: nullable(v.phone), body } };
}

// 場・団体の新規登録
export function parseNewActorForm(
	handle: string,
	name: string,
	kind: string
):
	| { ok: true; handle: string; name: string; kind: 'space' | 'group' }
	| { ok: false; error: string } {
	const h = handle.trim().toLowerCase();
	const n = name.trim();
	if (!isValidHandle(h))
		return { ok: false, error: 'ID は小文字の英数字と _ で 3〜20 文字。予約語は使えません' };
	if (!n || n.length > 50) return { ok: false, error: '名前は 1〜50 文字' };
	if (kind !== 'space' && kind !== 'group') return { ok: false, error: '種類を選んでください' };
	return { ok: true, handle: h, name: n, kind };
}
