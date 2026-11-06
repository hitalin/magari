import type { RequestHandler } from "./$types";

const handler: RequestHandler = ({ request, locals }) =>
	locals.auth.handler(request);

export const GET = handler;
export const POST = handler;
