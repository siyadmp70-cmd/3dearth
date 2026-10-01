import { cp } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// Calling Vite's API avoids config-file subprocess resolution on restricted Windows hosts.
await build({
  configFile: false,
  root: process.cwd(),
  base: './',
  plugins: [react()],
  build: { copyPublicDir: false },
});

// Keep the supplied motion reference local to development/review; never ship it with the site.
const root = process.cwd();
await cp(join(root, 'public'), join(root, 'dist'), {
  recursive: true,
  filter: (source) => !source.split(sep).includes('reference'),
});
