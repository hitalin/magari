import { error, fail } from '@sveltejs/kit';
import { getActorByHandle } from '#lib/server/events.ts';
import { createInquiry } from '#lib/server/spaces.ts';
import { parseInquiryForm } from '#lib/space-form.ts';
import type { Actions } from './$types';

// 読み取りは +page.ts（CDN キャッシュ済み JSON）。ここは問い合わせの書き込みだけ
export const actions: Actions = {
	inquire: async ({ request, locals, params }) => {
		const actor = await getActorByHandle(locals.db, params.handle);
		if (!actor || actor.kind === 'person') error(404, '見つかりません');
		const form = await request.formData();
		const values = {
			kind: String(form.get('kind') ?? ''),
			name: String(form.get('name') ?? ''),
			email: String(form.get('email') ?? ''),
			phone: String(form.get('phone') ?? ''),
			body: String(form.get('body') ?? ''),
			website: String(form.get('website') ?? '')
		};
		const parsed = parseInquiryForm(values);
		// bot（ハニーポットに入力あり）は送ったふりをして捨てる
		if (!parsed.ok && parsed.error === 'bot') return { sent: true };
		if (!parsed.ok) return fail(400, { error: parsed.error, values });
		await createInquiry(locals.db, actor.id, parsed.values);
		return { sent: true };
	}
};
