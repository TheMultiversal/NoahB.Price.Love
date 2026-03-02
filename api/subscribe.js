module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In a production setup, connect to an email service (Mailchimp, ConvertKit, etc.)
  const email = req.body && req.body.email;
  console.log('New subscriber:', email);
  res.send('Thank you for subscribing!');
};
