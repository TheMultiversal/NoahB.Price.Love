module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Audio uploads require persistent storage (Vercel Blob, S3, etc.)
  // For now, the site music is served statically from /seed/site-music.m4a
  res.status(200).send(
    'Audio upload is not available in static deployment mode. ' +
    'Site music is served from the /seed/ directory. ' +
    'To update it, replace the file in public/seed/ and redeploy.'
  );
};
