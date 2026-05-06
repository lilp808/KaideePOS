export default function handler(req, res) {
  res.status(200).json({
    status: 'OK',
    service: 'LINE POS System (Vercel Serverless)',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}
