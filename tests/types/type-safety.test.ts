import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';

type Env = {
  DB: D1Database;
  QUEUE_SIGNUP: Queue;
};

const { defineQueue } = createSDK<Env>();
const { defineQueue: defineQueueAuto } = createSDK();

const signupQueue = defineQueue({
  message: z.object({
    email: z.string().email(),
    userId: z.string()
  }),
  process: async (ctx, msg) => {
    ctx.env.DB;
    msg.email;
  }
});

signupQueue.send(
  {
    env: {
      DB: {} as D1Database,
      QUEUE_SIGNUP: {} as Queue
    }
  },
  { email: 'ok@example.com', userId: 'abc' },
  { delay: '30s', contentType: 'json' }
);

signupQueue.sendBatch(
  {
    env: {
      DB: {} as D1Database,
      QUEUE_SIGNUP: {} as Queue
    }
  },
  [{ data: { email: 'ok@example.com', userId: 'abc' } }],
  { delay: '5m', contentType: 'json' }
);

// @ts-expect-error invalid content type
const invalidSendOptions: Parameters<typeof signupQueue.send>[2] = { contentType: 'xml' };

// @ts-expect-error invalid delay format
const invalidDelay: Parameters<typeof signupQueue.send>[2] = { delay: 'forever' };

// @ts-expect-error missing userId
const invalidSignupPayload: Parameters<typeof signupQueue.send>[1] = { email: 'ok@example.com' };

const autoQueue = defineQueueAuto({
  message: z.object({ id: z.string() }),
  process: async (ctx, msg) => {
    ctx.env.ANY_BINDING;
    msg.id;
  }
});

autoQueue.send({ env: {} }, { id: 'x' });

const jobs = defineQueue({
  signup: {
    message: z.object({ email: z.string() }),
    process: async () => {
      return;
    }
  },
  invoice: {
    message: z.object({ amount: z.number() }),
    process: async () => {
      return;
    }
  },
  retry: 3
});

// @ts-expect-error multi-job queue keys must be job configs (or reserved config keys)
defineQueue({
  signup: {
    message: z.object({ email: z.string() }),
    process: async () => {
      return;
    }
  },
  typo: 123
});

// @ts-expect-error multi-job queue requires at least one job definition
defineQueue({
  retry: 2
});

// @ts-expect-error onFailure is only valid inside each job config in multi-job mode
defineQueue({
  signup: {
    message: z.object({ email: z.string() }),
    process: async () => {
      return;
    }
  },
  onFailure: async () => {}
});

jobs.signup.send(
  {
    env: {
      DB: {} as D1Database,
      QUEUE_SIGNUP: {} as Queue
    }
  },
  { email: 'ok@example.com' }
);

// @ts-expect-error wrong payload type for job
const invalidInvoicePayload: Parameters<typeof jobs.invoice.send>[1] = { email: 'x@example.com' };

const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull' }
});

pullQueue.send(
  {
    env: {
      DB: {} as D1Database,
      QUEUE_SIGNUP: {} as Queue
    }
  },
  { id: '123' }
);

// @ts-expect-error pull consumers cannot define process
defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull' },
  process: async () => {}
});

// @ts-expect-error internal methods are not public API
signupQueue.__setBinding('QUEUE_SIGNUP');
