import { describe, expect, it } from 'vitest';
import { largeAvatarUrl } from './me';

describe('largeAvatarUrl', () => {
	it('X の _normal を 400x400 にする', () => {
		expect(largeAvatarUrl('https://pbs.twimg.com/profile_images/1/abc_normal.jpg')).toBe(
			'https://pbs.twimg.com/profile_images/1/abc_400x400.jpg'
		);
	});
	it('Misskey のプロキシ縮小は元画像にする', () => {
		expect(
			largeAvatarUrl(
				'https://yami.ski/proxy/avatar.webp?url=https%3A%2F%2Ffiles.example%2Fa.png&avatar=1'
			)
		).toBe('https://files.example/a.png');
	});
	it('それ以外はそのまま。空なら null', () => {
		expect(largeAvatarUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
		expect(largeAvatarUrl(null)).toBeNull();
	});
});
