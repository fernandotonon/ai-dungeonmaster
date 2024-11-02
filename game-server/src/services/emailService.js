const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const sendInviteEmail = async (email, inviteLink, gameName, inviterName) => {
  const mailOptions = {
    from: {
      name: 'D.ai RPG',
      address: `noreply@rpg.ftonon.uk`
    },
    to: email,
    subject: 'D.ai RPG: Your Friend Invited You to Join a Story!',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Friend Invited You to Join a Story in D.ai RPG!</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f9;
                  color: #333;
                  margin: 0;
                  padding: 0;
              }
              .container {
                  max-width: 600px;
                  margin: auto;
                  background: #ffffff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #4c9aff;
                  text-align: center;
              }
              p {
                  font-size: 16px;
                  line-height: 1.6;
              }
              .button {
                  display: block;
                  width: 220px;
                  margin: 20px auto;
                  padding: 15px;
                  text-align: center;
                  background-color: #4c9aff;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 4px;
                  font-weight: bold;
              }
              .button:hover {
                  background-color: #357ecf;
              }
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 12px;
                  color: #777;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>🌟 Your Friend Wants You to Join Their Adventure! 🌟</h1>
              <p>Hi there,</p>
              
              <p><strong>${inviterName}</strong> has invited you to join their story "${gameName}" in <strong>D.ai RPG</strong>, a world where imagination and adventure await at every turn. Together, you'll explore unique realms, overcome challenges, and shape the story through every choice you make.</p>
              
              <p>This is a journey like no other, where cutting-edge AI meets classic role-playing. As a team, you'll face quests, unlock mysteries, and experience a tale crafted just for you. Ready to make your mark?</p>
              
              <a href="${inviteLink}" class="button">Accept the Invitation</a>
              
              <p>Click above to join the story and step into an epic world of magic, technology, and endless possibilities. We can't wait to see where your journey takes you!</p>
              
              <p>Happy adventuring,<br>The D.ai RPG Team</p>
              
              <div class="footer">
                  <p>If you didn't expect this invitation, please disregard this email.</p>
                  <p>&copy; 2024 D.ai RPG. All Rights Reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendInviteEmail };