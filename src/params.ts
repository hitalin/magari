import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	// /@handle 形式のセグメントだけに一致し、先頭の @ を外した handle を params に渡す
	at: (param) => (/^@[a-z0-9_]{3,20}$/.test(param) ? param.slice(1) : undefined)
});
