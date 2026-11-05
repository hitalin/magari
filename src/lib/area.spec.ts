import { describe, expect, it } from 'vitest';
import { detectArea } from './area';

describe('detectArea', () => {
	it('会場文字列から都道府県を返す（接尾辞なし）', () => {
		expect(detectArea("東京都品川区　Mother Nature's Son")).toBe('東京');
		expect(detectArea('神奈川県横浜市都筑区　いのちの木')).toBe('神奈川');
		expect(detectArea('大阪府大阪市　中央区千日前')).toBe('大阪');
		expect(detectArea('北海道札幌市')).toBe('北海道');
		expect(detectArea('京都市中京区')).toBe('京都');
	});
	it('オンラインを優先する', () => {
		expect(detectArea('オンライン　Zoom')).toBe('オンライン');
		expect(detectArea('Zoom（東京都のグループ）')).toBe('オンライン');
	});
	it('分からなければ null', () => {
		expect(detectArea('どこかの公園')).toBeNull();
		expect(detectArea(null)).toBeNull();
	});
});
