import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await locals.auth.api.signOut({ headers: request.headers });
	redirect(303, '/');
};
