import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGemmaRequest } from '../server/gemmaHandler.ts';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleGemmaRequest(req, res);
}
