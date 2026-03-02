const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  // Check for audio files in the static seed directory
  const seedDir = path.join(process.cwd(), 'public', 'seed');
  const candidates = ['site-music.mp3', 'site-music.m4a'];

  for (const name of candidates) {
    const f = path.join(seedDir, name);
    try {
      const stat = fs.statSync(f);
      return res.json({
        version: stat.mtimeMs || new Date(stat.mtime).getTime(),
        file: name
      });
    } catch (err) {
      /* try next */
    }
  }

  return res.json({ version: Date.now() });
};
