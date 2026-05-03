import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, message, otp, action, to, subject, data } = req.body;

  const SMTP_USER = process.env.SMTP_USER || "noreply@ezyintern.in";
  const SMTP_PASS = process.env.SMTP_PASS || "Ezyintern@Bhopal&2026";

  if (!SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({ success: false, message: 'SMTP Credentials missing' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    let mailOptions: any = {
      from: `"EzyIntern" <${SMTP_USER}>`,
      to: to || email,
    };

    if (action === 'test_mail') {
      mailOptions.subject = `[TEST] ${subject || 'Diagnostic Test'}`;
      mailOptions.html = `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #0084FF; border-radius: 10px;">
          <h2 style="color: #0084FF;">EzyIntern Mail Test</h2>
          <p>Manual test from Super Admin Panel via Vercel API.</p>
          <hr/>
          <p><strong>Message:</strong> ${message || 'No content'}</p>
        </div>
      `;
    } else if (action === 'send_otp') {
      mailOptions.subject = 'Your Password Reset OTP';
      mailOptions.html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0084FF; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          <div style="padding: 32px; text-align: center; color: #1e293b;">
            <p style="font-size: 16px; margin-bottom: 24px;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">You requested to reset your password. Use the 6-digit code below to proceed:</p>
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin: 32px 0; display: inline-block;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0084FF; font-family: monospace;">${otp}</span>
            </div>
          </div>
        </div>
      `;
    } else if (action === 'registration_confirmation') {
      mailOptions.subject = `✅ Registration Confirmed — EzyIntern (ID: ${data.registrationId})`;
      mailOptions.html = `
        <div style="font-family: sans-serif; padding: 32px; border: 1px solid #eee; border-radius: 16px;">
          <h1 style="color: #4F46E5;">Welcome to EzyIntern!</h1>
          <p>Hello ${data.fullName}, your registration is confirmed.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p><strong>Registration ID:</strong> ${data.registrationId}</p>
            <p><strong>Domain:</strong> ${data.course}</p>
          </div>
          <a href="https://www.ezyintern.com/login" style="display:inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">Access Portal</a>
        </div>
      `;
    } else if (action === 'certificate_generated') {
      mailOptions.subject = `🏆 Your EzyIntern Certificate is Ready — ${data.certificateId}`;
      mailOptions.html = `
        <div style="font-family: sans-serif; padding: 32px; border: 1px solid #eee; border-radius: 16px;">
          <h1 style="color: #059669;">Certificate Ready!</h1>
          <p>Dear ${data.studentName}, your certificate for ${data.programme} is now available.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p><strong>Certificate ID:</strong> ${data.certificateId}</p>
          </div>
          <a href="https://www.ezyintern.com/dashboard" style="display:inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 8px;">Download Certificate</a>
        </div>
      `;
    } else {
      // Default contact form
      mailOptions.from = `"EzyIntern Contact" <${SMTP_USER}>`;
      mailOptions.to = 'noreply@ezyintern.in';
      mailOptions.subject = `New Contact Request from ${name || 'User'}`;
      mailOptions.html = `<h3>Message from ${name} (${email}):</h3><p>${message}</p>`;
      
      // Also send confirmation to user
      await transporter.sendMail({
        from: `"EzyIntern Support" <${SMTP_USER}>`,
        to: email,
        subject: 'We received your message!',
        html: `<p>Hi ${name}, we received your message and will get back to you soon.</p>`
      });
    }

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
}
