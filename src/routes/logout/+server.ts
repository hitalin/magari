import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	await locals.auth.api.signOut({ headers: request.headers });
	// 表示専用の Cookie を hooks が消すように
	locals.session = null;
	redirect(303, "/");
};
