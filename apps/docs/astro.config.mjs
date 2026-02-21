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
          label: 'Suite',
          items: [
            {
              label: 'Overview',
              link: '/'
            },
            {
              label: 'Why better-cf',
              link: '/why-better-cf'
            },
            {
              label: 'Roadmap',
              link: '/reference/roadmap'
            }
          ]
        },
        {
          label: 'Queue SDK',
          items: [
            {
              label: 'Getting Started',
              items: [
                { label: 'Quickstart', link: '/getting-started' },
                { label: 'Installation & Prereqs', link: '/guides/installation' },
                { label: 'First Queue Walkthrough', link: '/guides/first-queue' },
                { label: 'File Structure', link: '/guides/file-structure' },
                { label: 'Limitations', link: '/limitations' }
              ]
            },
            {
              label: 'Guides',
              items: [
                { label: 'Producer Patterns', link: '/guides/producer-patterns' },
                { label: 'Consumer Patterns', link: '/guides/consumer-patterns' },
                { label: 'Retry + DLQ + Batch Tuning', link: '/guides/retry-batch-tuning' },
                { label: 'HTTP Pull Consumers', link: '/guides/http-pull-consumers' },
                { label: 'Hono', link: '/guides/hono' },
                { label: 'Env Typing Modes', link: '/guides/env-typing-modes' },
                { label: 'Legacy Cloudflare Migration', link: '/guides/legacy-cloudflare' }
              ]
            },
            {
              label: 'Operations',
              items: [
                { label: 'Automation CLI', link: '/guides/automation-cli' },
                { label: 'Queue Admin CLI', link: '/guides/queue-admin-cli' },
                { label: 'Production Checklist', link: '/guides/production-checklist' },
                { label: 'Troubleshooting', link: '/guides/troubleshooting' }
              ]
            },
            {
              label: 'API Reference',
              items: [
                { label: 'Queue SDK API', link: '/api/queue' },
                { label: 'Testing API', link: '/api/testing' },
                { label: 'CLI Command Reference', link: '/reference/cli-reference' }
              ]
            },
            {
              label: 'Architecture',
              items: [
                { label: 'Discovery + Codegen', link: '/architecture/discovery-and-codegen' },
                { label: 'Wrangler Mapping', link: '/reference/wrangler-mapping' },
                { label: 'Error Reference', link: '/reference/errors' },
                { label: 'Compatibility', link: '/reference/compatibility' }
              ]
            },
            {
              label: 'Examples & Comparison',
              items: [
                { label: 'Queue Cookbook', link: '/examples/cookbook' },
                { label: 'Cloudflare vs better-cf', link: '/comparison/cloudflare-vs-better-cf' }
              ]
            }
          ]
        }
      ]
    })
  ]
});
