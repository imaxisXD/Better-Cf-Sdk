import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://better-cf.pages.dev',
  integrations: [
    starlight({
      title: 'better-cf',
      description:
        'Modern Cloudflare SDK suite from better-cf focused on functional API design, typed contracts, and a better developer workflow.',
      customCss: ['/src/styles/theme.css'],
      components: {
        Sidebar: './src/components/ConditionalSidebar.astro'
      },
      sidebar: [
        {
          label: 'Why better-cf',
          items: [
            { label: 'Why better-cf', link: '/why-better-cf' },
            { label: 'Roadmap', link: '/reference/roadmap' }
          ]
        },
        {
          label: 'SDK Catalog',
          items: [
            {
              label: 'Queue SDK',
              link: '/getting-started',
              badge: { text: 'Alpha', class: 'sdk-badge-alpha' }
            },
            {
              label: 'Workflow SDK',
              link: '#',
              badge: { text: 'Coming Soon', class: 'sdk-badge-coming-soon' },
              attrs: {
                class: 'sdk-link--coming-soon',
                'aria-disabled': true,
                tabindex: -1
              }
            },
            {
              label: 'Durable Objects SDK',
              link: '#',
              badge: { text: 'Coming Soon', class: 'sdk-badge-coming-soon' },
              attrs: {
                class: 'sdk-link--coming-soon',
                'aria-disabled': true,
                tabindex: -1
              }
            }
          ]
        },
        {
          label: 'Queue SDK Docs',
          items: [
            {
              label: 'Start Here',
              items: [
                { label: 'Getting Started', link: '/getting-started' },
                { label: 'Limitations', link: '/limitations' }
              ]
            },
            {
              label: 'Examples',
              items: [{ label: 'Queue Cookbook', link: '/examples/cookbook' }]
            },
            {
              label: 'Comparison',
              items: [
                {
                  label: 'Cloudflare vs better-cf',
                  link: '/comparison/cloudflare-vs-better-cf'
                }
              ]
            },
            {
              label: 'API',
              items: [
                { label: 'Queue SDK API', link: '/api/queue' },
                { label: 'Testing API', link: '/api/testing' }
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
                { label: 'Error Reference', link: '/reference/errors' },
                { label: 'Compatibility', link: '/reference/compatibility' }
              ]
            }
          ]
        }
      ]
    })
  ]
});
