let appPromise;

async function getApp() {
  if (!appPromise) {
    const serverBundle = await import('../dist/server.cjs');
    const createApp = serverBundle.createApp || serverBundle.default?.createApp;

    if (!createApp) {
      throw new Error('Vercel API could not load the compiled server app.');
    }

    appPromise = createApp({
      serveStatic: false,
      runStartupChecks: false
    });
  }

  return appPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
