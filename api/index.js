import handleApiRequest from './_handler.js';

export default async function handler(req, res) {
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
