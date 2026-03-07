import { z } from 'zod';
import { room } from './schema';

export const sendMessage = room.fn({
  description: 'Append a room message.',
  args: z.object({
    body: z.string(),
    author: z.string()
  }),
  returns: z.object({
    ok: z.literal(true)
  }),
  handler: async ({ storage }, args) => {
    const messages = ((await storage.get('messages')) as unknown[] | undefined) ?? [];
    messages.push(args);
    await storage.put('messages', messages);
    return { ok: true };
  }
});

export const markEmailSent = room.internal({
  description: 'Mark an email as sent.',
  args: z.object({
    to: z.string().email()
  }),
  returns: z.null(),
  handler: async ({ storage }, args) => {
    const sent = ((await storage.get('sent')) as string[] | undefined) ?? [];
    sent.push(args.to);
    await storage.put('sent', sent);
    return null;
  }
});

export const roomInit = room.init({
  description: 'Warm initial room state.',
  handler: async ({ storage }) => {
    const existing = await storage.get('messages');
    if (!existing) {
      await storage.put('messages', []);
    }
  }
});

export const roomFetch = room.fetch({
  description: 'Serve room metadata.',
  handler: async ({ request }) => new Response(new URL(request.url).pathname)
});

export const roomAlarm = room.alarm({
  description: 'Process room alarm ticks.',
  handler: async () => {
    return;
  }
});

export const roomSocket = room.websocket({
  description: 'Handle room websocket sessions.',
  connect: async ({ accept }) => {
    accept({ tags: ['room'] });
  },
  message: async ({ socket }, message) => {
    socket.send(typeof message === 'string' ? message : new Uint8Array(message));
  }
});
