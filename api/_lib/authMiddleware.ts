import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key'
  );
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export function authenticateRequest(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res);

  const secretKey = process.env.API_SECRET_KEY;
  // If no secret key is configured on server, permit access (open mode)
  if (!secretKey || secretKey.trim() === '') {
    return true;
  }

  // Check Authorization Bearer header or x-api-key header
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  let token = apiKeyHeader;
  if (!token && authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token || token !== secretKey.trim()) {
    res.status(401).json({
      success: false,
      error: 'Xavfsizlik xatosi: Noto\'g\'ri yoki mavjud bo\'lmagan API kalit (Unauthorized).',
    });
    return false;
  }

  return true;
}

export function sendJson(res: VercelResponse, statusCode: number, data: any) {
  setCorsHeaders(res);
  res.status(statusCode).json(data);
}

export function sendError(res: VercelResponse, statusCode: number, message: string, details?: any) {
  setCorsHeaders(res);
  res.status(statusCode).json({
    success: false,
    error: message,
    details: details ? (typeof details === 'object' ? details.message || details : String(details)) : undefined,
  });
}
