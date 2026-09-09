import handleApiRequest from './_handler.js';

export default async function handler(req, res) {
  const renderPath = req.query?.render;

  if (renderPath) {
    const pathValue = Array.isArray(renderPath)
      ? renderPath.join('/')
      : String(renderPath);
    const url = new URL(req.url || '/', 'http://localhost');
    url.searchParams.delete('render');
    const search = url.searchParams.toString();

    req.url = `/${pathValue}${search ? `?${search}` : ''}`;
  }

  const rewrittenPath = req.query?.path;

  if (rewrittenPath) {
    const pathValue = Array.isArray(rewrittenPath)
      ? rewrittenPath.join('/')
      : String(rewrittenPath);
    const url = new URL(req.url || '/api', 'http://localhost');
    url.searchParams.delete('path');
    const search = url.searchParams.toString();

    req.url = `/api/${pathValue}${search ? `?${search}` : ''}`;
  }

  return handleApiRequest(req, res);
}
