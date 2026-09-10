let appPromise;

export async function handleApiRequest(req, res) {
  if (!appPromise) {
    const serverBundle = await import('../dist/server.cjs');
    const createApp = serverBundle.createApp || serverBundle.default?.createApp;

    if (!createApp) {
      throw new Error('Vercel API could not load the compiled server app.');
    }

    appPromise = createApp({
      serveStatic: false,
      runStartupChecks: true
    });
  }

  const app = await appPromise;
  return app(req, res);
}

export default handleApiRequest;
