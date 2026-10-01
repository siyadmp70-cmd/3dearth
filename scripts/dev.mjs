import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    watch: { ignored: ['**/public/reference/**', '**/public/videos/**'] },
  },
});

await server.listen();
server.printUrls();
