
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import react from "@astrojs/react";

export default defineConfig({
  output: 'server', // dev OK; adapter will be added only for deployment
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    tailwind()
  ],
});
