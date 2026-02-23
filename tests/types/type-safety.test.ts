import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { testQueue } from '../../src/testing/index.js';

type Env = {
  DB: D1Database;
  QUEUE_SIGNUP: Queue;
};

const { defineQueue, defineQueues } = createSDK<Env>();
const { defineQueue: defineQueueAuto } = createSDK();

const signupQueue = defineQueue({
  args: z.object({
    email: z.string().email(),
    userId: z.string()
  }),
  handler: async (ctx, msg) => {
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

const queueTestEnv = {
  DB: {} as D1Database,
  QUEUE_SIGNUP: {} as Queue
};

testQueue(signupQueue, {
  env: queueTestEnv,
  message: { email: 'ok@example.com', userId: 'abc' }
});

// @ts-expect-error testQueue requires exactly one of message/messages
testQueue(signupQueue, {
  env: queueTestEnv
});

// @ts-expect-error testQueue does not accept message and messages together
testQueue(signupQueue, {
  env: queueTestEnv,
  message: { email: 'ok@example.com', userId: 'abc' },
  messages: [{ email: 'ok@example.com', userId: 'abc' }]
});

// @ts-expect-error invalid content type
const invalidSendOptions: Parameters<typeof signupQueue.send>[2] = { contentType: 'xml' };

// @ts-expect-error invalid delay format
const invalidDelay: Parameters<typeof signupQueue.send>[2] = { delay: 'forever' };

// @ts-expect-error missing userId
const invalidSignupPayload: Parameters<typeof signupQueue.send>[1] = { email: 'ok@example.com' };

const autoQueue = defineQueueAuto({
  args: z.object({ id: z.string() }),
  handler: async (ctx, msg) => {
    ctx.env.ANY_BINDING;
    msg.id;
  }
});

autoQueue.send({ env: {} }, { id: 'x' });

const jobs = defineQueues({
  signup: {
    args: z.object({ email: z.string() }),
    handler: async () => {
      return;
    }
  },
  invoice: {
    args: z.object({ amount: z.number() }),
    handler: async () => {
      return;
    }
  },
  retry: 3
});

defineQueue({
  // @ts-expect-error defineQueue is single-queue only
  signup: {
    args: z.object({ email: z.string() }),
    handler: async () => {
      return;
    }
  },
  retry: 2
});

defineQueues({
  // @ts-expect-error defineQueues is multi-job only
  args: z.object({ id: z.string() }),
  // @ts-expect-error defineQueues is multi-job only
  handler: async () => {
    return;
  }
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
  args: z.object({ id: z.string() }),
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

// @ts-expect-error pull consumers cannot define handler
defineQueue({
  args: z.object({ id: z.string() }),
  consumer: { type: 'http_pull' },
  handler: async () => {}
});

// @ts-expect-error internal methods are not public API
signupQueue.__setBinding('QUEUE_SIGNUP');
