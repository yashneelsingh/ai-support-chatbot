import nodemailer from 'nodemailer';

let transporter;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
})[character]);

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required to send password reset emails');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
};

export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  await getTransporter().sendMail({
    from: `"Helix Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your Helix password',
    text: `Hi ${name},\n\nReset your Helix password using this link: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
    html: `
      <h2>Reset your Helix password</h2>
      <p>Hi ${safeName},</p>
      <p>Use the link below to choose a new password:</p>
      <p><a href="${safeResetUrl}">Reset password</a></p>
      <p>This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>
    `,
  });
};
