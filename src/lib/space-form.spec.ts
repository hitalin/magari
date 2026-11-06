import { describe, expect, it } from 'vitest';
import {
	EMPTY_SPACE_FORM,
	parseInquiryForm,
	parseLinks,
	parseNewActorForm,
	parsePlanForm,
	parsePostForm,
	parseSpaceForm,
	readSpaceForm
} from './space-form';

describe('parseLinks', () => {
	it('1 行 1 リンク。最後の語が URL、残りがラベル', () => {
		expect(parseLinks('板橋シアター咲 https://theater-saki.com/\nhttps://example.com')).toEqual([
			{ label: '板橋シアター咲', url: 'https://theater-saki.com/' },
			{ label: 'example.com', url: 'https://example.com' }
		]);
	});
	it('URL でない行はエラー', () => {
		expect(parseLinks('ただの文字')).toBeNull();
	});
});

describe('parseSpaceForm', () => {
	const base = { ...EMPTY_SPACE_FORM, name: 'カレー屋' };
	it('設備はカンマ・読点で分け、@ と URL は整える', () => {
		const r = parseSpaceForm({
			...base,
			facilities: '厨房, Wi-Fi、電源',
			xHandle: '@curry_shop',
			instagram: 'https://www.instagram.com/curry.shop/',
			url: 'https://curry.example'
		});
		expect(r.ok && r.values.facilities).toEqual(['厨房', 'Wi-Fi', '電源']);
		expect(r.ok && r.values.xHandle).toBe('curry_shop');
		expect(r.ok && r.values.instagram).toBe('curry.shop');
	});
	it('空欄は null、名前が無ければエラー', () => {
		const r = parseSpaceForm(base);
		expect(r.ok && r.values.catch).toBeNull();
		expect(r.ok && r.values.links).toEqual([]);
		expect(parseSpaceForm({ ...base, name: '' }).ok).toBe(false);
		expect(parseSpaceForm({ ...base, url: 'curry.example' }).ok).toBe(false);
	});
	it('readSpaceForm は無い項目を空文字にする', () => {
		expect(readSpaceForm(() => null)).toEqual(EMPTY_SPACE_FORM);
	});
});

describe('parsePlanForm', () => {
	it('名前が必須、種類は既知のものだけ', () => {
		const r = parsePlanForm({
			name: '間借りパートナー',
			kind: 'spot',
			priceText: '昼 3,000円',
			description: ''
		});
		expect(r.ok && r.values.kind).toBe('spot');
		expect(r.ok && r.values.description).toBeNull();
		expect(parsePlanForm({ name: '', kind: 'spot', priceText: '', description: '' }).ok).toBe(
			false
		);
		const bad = parsePlanForm({ name: 'x', kind: 'nope', priceText: '', description: '' });
		expect(bad.ok && bad.values.kind).toBe('other');
	});
});

describe('parsePostForm', () => {
	it('題が必須', () => {
		expect(parsePostForm({ title: 'オープン', body: '' }).ok).toBe(true);
		expect(parsePostForm({ title: '', body: 'x' }).ok).toBe(false);
	});
});

describe('parseInquiryForm', () => {
	const v = {
		kind: 'rental',
		name: '山田',
		email: 'a@example.com',
		phone: '',
		body: '間借りしたい',
		website: ''
	};
	it('必須項目とメールの形を見る', () => {
		expect(parseInquiryForm(v).ok).toBe(true);
		expect(parseInquiryForm({ ...v, email: 'nope' }).ok).toBe(false);
		expect(parseInquiryForm({ ...v, body: '' }).ok).toBe(false);
	});
	it('ハニーポットに入力があれば bot として弾く', () => {
		const r = parseInquiryForm({ ...v, website: 'http://spam' });
		expect(!r.ok && r.error).toBe('bot');
	});
});

describe('parseNewActorForm', () => {
	it('handle と名前と種類', () => {
		const r = parseNewActorForm('Curry_Shop', 'カレー屋', 'space');
		expect(r.ok && r.handle).toBe('curry_shop');
		expect(r.ok && r.kind).toBe('space');
		expect(parseNewActorForm('me', 'x', 'space').ok).toBe(false);
		expect(parseNewActorForm('abc', 'x', 'person').ok).toBe(false);
	});
});
