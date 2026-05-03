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

  const { name, email, message, otp, action } = req.body;

  if (action === 'send_otp') {
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Missing email or OTP for reset' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false // Helps with some hosting provider certificate issues
        }
      });

      const mailOptions = {
        from: `"EzyIntern Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Password Reset OTP',
        html: `
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
              <p style="font-size: 14px; color: #64748b;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              © 2026 EzyIntern. All rights reserved.
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, message: 'OTP sent successfully!' });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP', 
        error: error.message,
        stack: error.stack // Temporarily adding for debugging
      });
    }
  }

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 1. Send the email containing user message to the admin
    const adminMailOptions = {
      from: `"EzyIntern Contact Form" <${process.env.SMTP_USER}>`,
      to: 'noreplay@ezyintern.in',
      subject: `New Contact Request from ${name}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // 2. Send confirmation email to the user
    const userMailOptions = {
      from: `"EzyIntern Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'We received your message!',
      html: `
        <h3>Hi ${name},</h3>
        <p>Thank you for reaching out to EzyIntern.</p>
        <p>We have successfully received your message and our team will get back to you shortly.</p>
        <br/>
        <p>Best regards,<br/>The EzyIntern Team</p>
      `,
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    return res.status(200).json({ success: true, message: 'Emails sent successfully!' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
}
