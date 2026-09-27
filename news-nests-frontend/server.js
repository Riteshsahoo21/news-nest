import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

// Constants
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5174;
const base = process.env.BASE || '/';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p) => path.resolve(__dirname, p);

async function createServer() {
  const app = express();



  let vite;
  if (!isProd) {
    vite = await (await import('vite')).createServer({
      server: { middlewareMode: true },
      appType: 'custom',
      base
    });
    app.use(vite.middlewares);
  } else {
    app.use((await import('compression')).default());
    app.use(base, (await import('serve-static')).default(resolve('dist/client'), {
      index: false,
    }));
  }

  // Guard static assets from falling through to SSR HTML handler
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|json)$/)) {
      return res.status(404).send('Asset not found');
    }
    next();
  });

  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;

      let template, render;
      if (!isProd) {
        template = await fs.readFile(resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render;
      } else {
        template = await fs.readFile(resolve('dist/client/index.html'), 'utf-8');
        render = (await import('./dist/server/entry-server.js')).render;
      }

      const { html, helmet } = await render(url);

      const headTags = helmet
        ? `
        ${helmet.title.toString()}
        ${helmet.meta.toString()}
        ${helmet.link.toString()}
        ${helmet.script.toString()}
      `
        : '';

      const htmlWithSSR = template
        .replace('<!--app-head-->', headTags)
        .replace('<!--app-html-->', html ?? '');

      res.status(200).set({ 'Content-Type': 'text/html' }).end(htmlWithSSR);
    } catch (e) {
      vite?.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
}

createServer().then(({ app }) => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`SSR Server is running at http://localhost:${port}`);
  });
});
