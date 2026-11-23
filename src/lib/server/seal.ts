// DB に置く値を封じる（AES-GCM）。D1 を持ち出しても、Worker の秘密が無ければ読めない。
// aad は、その値の持ち主（行をほかの持ち主へ付け替えても開かない）
const encoder = new TextEncoder();

async function keyOf(secret: string): Promise<CryptoKey> {
	const base = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		"HKDF",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(),
			info: encoder.encode("magari seal v1"),
		},
		base,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function seal(
	secret: string,
	aad: string,
	value: unknown,
): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const sealed = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
		await keyOf(secret),
		encoder.encode(JSON.stringify(value)),
	);
	return btoa(String.fromCharCode(...iv, ...new Uint8Array(sealed)));
}

// 開かないもの（秘密を替えた、持ち主が違う、壊れている）は null
export async function unseal<T>(
	secret: string,
	aad: string,
	sealed: string,
): Promise<T | null> {
	try {
		const bytes = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
		const plain = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: bytes.subarray(0, 12),
				additionalData: encoder.encode(aad),
			},
			await keyOf(secret),
			bytes.subarray(12),
		);
		return JSON.parse(new TextDecoder().decode(plain));
	} catch {
		return null;
	}
}
