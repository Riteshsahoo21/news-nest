import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { Writable } from 'stream';
import App from './App.jsx';

export function render(url) {
  const normalizedUrl = url ? (url.startsWith('/') ? url : '/' + url) : '/';
  return new Promise((resolve, reject) => {
    const helmetContext = {};
    let html = '';

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={normalizedUrl}>
            <App helmetContext={helmetContext} />
          </StaticRouter>
        </HelmetProvider>
      </StrictMode>,
      {
        onAllReady() {
          const stream = new Writable({
            write(chunk, encoding, callback) {
              html += chunk.toString();
              callback();
            }
          });
          stream.on('finish', () => {
            resolve({ html, helmet: helmetContext.helmet });
          });
          pipe(stream);
        },
        onShellError(err) {
          reject(err);
        },
        onError(err) {
          console.error('SSR render error:', err);
        }
      }
    );
  });
}
