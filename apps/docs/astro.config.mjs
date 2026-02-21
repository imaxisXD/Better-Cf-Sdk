import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://better-cf.pages.dev',
  integrations: [
    starlight({
      title: 'better-cf',
      description: 'Opinionated Cloudflare Queue SDK + CLI focused on modern DX',
      customCss: ['/src/styles/theme.css'],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Why better-cf', link: '/why-better-cf' },
            { label: 'Getting Started', link: '/getting-started' },
            { label: 'Limitations', link: '/limitations' }
          ]
        },
        {
          label: 'Examples',
          items: [{ label: 'Cookbook', link: '/examples/cookbook' }]
        },
        {
          label: 'Comparison',
          items: [
            {
              label: 'Cloudflare Native vs better-cf',
              link: '/comparison/cloudflare-native-vs-better-cf'
            }
          ]
        },
        {
          label: 'API',
          items: [
            { label: 'Queue', link: '/api/queue' },
            { label: 'Testing', link: '/api/testing' }
          ]
        },
        {
          label: 'Guides',
          items: [
            { label: 'Automation CLI', link: '/guides/automation-cli' },
            { label: 'Env Typing Modes', link: '/guides/env-typing-modes' },
            { label: 'Hono', link: '/guides/hono' },
            { label: 'Legacy Cloudflare', link: '/guides/legacy-cloudflare' },
            { label: 'Queue Admin CLI', link: '/guides/queue-admin-cli' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { label: 'Wrangler Mapping', link: '/reference/wrangler-mapping' },
            { label: 'Errors', link: '/reference/errors' },
            { label: 'Compatibility', link: '/reference/compatibility' },
            { label: 'Roadmap', link: '/reference/roadmap' }
          ]
        }
      ]
    })
  ]
});
