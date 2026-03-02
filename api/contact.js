module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body || {};
  // In a production setup, connect to an email service or database
  console.log('New contact message from:', name, email, message);
  res.send('Thank you for your message!');
};
