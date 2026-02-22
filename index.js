const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  console.error('Could not ensure uploads directory', err);
}

// Seed uploads from packaged files on every startup, overwriting any existing audio so the latest seed is used
(function seedUploadsFromPackage(){
  try{
    const seeds = [
      { src: path.join(__dirname, 'public', 'seed', 'site-music.m4a'), dest: path.join(__dirname, 'uploads', 'site-music.m4a') },
      { src: path.join(__dirname, 'public', 'seed', 'site-music.mp3'), dest: path.join(__dirname, 'uploads', 'site-music.mp3') }
    ];
    seeds.forEach(s => {
      try{
        if(fs.existsSync(s.src)){
          fs.copyFileSync(s.src, s.dest);
          console.log('[SeedUploads] copied (overwrite)', s.src, '->', s.dest);
        }
      }catch(e){ console.error('[SeedUploads] error for', s.src, e); }
    });
  }catch(e){ console.error('[SeedUploads] failed', e); }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/public/about.html');
});

app.get('/books', (req, res) => {
  res.sendFile(__dirname + '/public/books.html');
});

app.get('/books/:book', (req, res) => {
  const book = req.params.book;
  res.sendFile(path.join(__dirname, 'public', 'books', book, 'index.html'));
});

app.get('/books/:book/:edition', (req, res) => {
  const book = req.params.book;
  const edition = req.params.edition;
  res.sendFile(path.join(__dirname, 'public', 'books', book, edition + '.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(__dirname + '/public/blog.html');
});

app.get('/latest-entry', (req, res) => {
  res.sendFile(__dirname + '/public/latest-entry.html');
});

app.get('/all-journals', (req, res) => {
  res.sendFile(__dirname + '/public/all-journals.html');
});

app.get('/journal/:entry', (req, res) => {
  const entry = req.params.entry;
  res.sendFile(__dirname + `/public/journals/${entry}.html`);
});

app.get('/contact', (req, res) => {
  res.sendFile(__dirname + '/public/contact.html');
});

app.get('/email-list', (req, res) => {
  res.sendFile(__dirname + '/public/email-list.html');
});

app.get('/upload', (req, res) => {
  res.sendFile(__dirname + '/public/upload.html');
});

app.get('/privacy', (req, res) => {
  res.sendFile(__dirname + '/public/privacy.html');
});

app.get('/terms', (req, res) => {
  res.sendFile(__dirname + '/public/terms.html');
});

app.get('/accessibility', (req, res) => {
  res.sendFile(__dirname + '/public/accessibility.html');
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    res.send('Image uploaded successfully: <img src="/uploads/' + req.file.filename + '" alt="Uploaded image">');
  } else {
    res.send('No file uploaded.');
  }
});

// Upload audio (site music) and set as site's background loop audio
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (req.file) {
    // Preserve original extension when saving (supports .mp3 and .m4a)
    const incomingExt = (path.extname(req.file.originalname) || '').toLowerCase();
    const allowed = ['.mp3', '.m4a'];
    const useExt = allowed.includes(incomingExt) ? incomingExt : '.mp3';
    const dest = path.join(__dirname, 'uploads', 'site-music' + useExt);
    try {
      fs.copyFileSync(req.file.path, dest);
      // remove the alternate extension if present
      const other = path.join(__dirname, 'uploads', 'site-music' + (useExt === '.mp3' ? '.m4a' : '.mp3'));
      try { if (fs.existsSync(other)) fs.unlinkSync(other); } catch(e){}
      res.send('Audio uploaded successfully: <a href="/uploads/' + path.basename(dest) + '">' + path.basename(dest) + '</a>');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving audio file.');
    }
  } else {
    res.send('No audio uploaded.');
  }
});

// Endpoint to return a version identifier (mtime) for the site audio file so clients can cache-bust
app.get('/audio-version', (req, res) => {
  const candidates = ['site-music.mp3', 'site-music.m4a'];
  for (const name of candidates) {
    const f = path.join(__dirname, 'uploads', name);
    try {
      const stat = fs.statSync(f);
      return res.json({ version: stat.mtimeMs || (new Date(stat.mtime)).getTime(), file: name });
    } catch (err) {
      /* try next */
    }
  }
  return res.json({ version: 0 });
});

app.post('/subscribe', (req, res) => {
  const email = req.body.email;
  // In a real app, save to database or email service
  console.log('New subscriber:', email);
  res.send('Thank you for subscribing!');
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  // In a real app, send email or save to database
  console.log('New contact message from:', name, email, message);
  res.send('Thank you for your message!');
});

// Debug endpoint to inspect uploads folder
app.get('/_debug_uploads', (req, res) => {
  try{
    const u = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(u);
    return res.json({ exists: true, files });
  }catch(err){
    console.error('[Debug Uploads] error', err);
    return res.json({ exists: false, error: String(err) });
  }
});

// Global error handler to surface errors in logs for debugging
app.use(function(err, req, res, next){
  console.error('[Express Error]', err && err.stack ? err.stack : err);
  res.status(500).send('Internal Server Error: ' + (err && err.message ? err.message : 'unknown'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});