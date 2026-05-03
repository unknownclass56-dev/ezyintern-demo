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
    } else if (action === 'send_otp' || action === 'login_otp') {
      const isLogin = action === 'login_otp';
      mailOptions.subject = isLogin ? 'Your Login Verification Code' : 'Your Password Reset OTP';
      mailOptions.html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0084FF; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${isLogin ? 'Login Verification' : 'Password Reset'}</h1>
          </div>
          <div style="padding: 32px; text-align: center; color: #1e293b;">
            <p style="font-size: 16px; margin-bottom: 24px;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">${isLogin ? 'Use the following code to complete your login:' : 'You requested to reset your password. Use the 6-digit code below to proceed:'}</p>
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin: 32px 0; display: inline-block;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0084FF; font-family: monospace;">${otp}</span>
            </div>
          </div>
        </div>
      `;
    } else if (action === 'registration_confirmation') {
      mailOptions.subject = `✅ Registration Confirmed — EzyIntern (ID: ${data.registrationId})`;
      mailOptions.html = `
        <div style="font-family: sans-serif; padding: 32px; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4F46E5; margin-bottom: 8px;">Welcome to EzyIntern! 🎓</h1>
            <p style="color: #64748b; font-size: 16px;">Your internship journey begins today.</p>
          </div>
          
          <p>Hello <strong>${data.fullName}</strong>,</p>
          <p>Congratulations! You have successfully registered for the EzyIntern programme. Your student account is now active.</p>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">🔐 Your Login Credentials</h3>
            <p style="margin: 8px 0;"><strong>Registration ID:</strong> ${data.registrationId}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin: 8px 0;"><strong>Password:</strong> ${data.password || 'As set during registration'}</p>
            <p style="margin: 8px 0;"><strong>Domain:</strong> ${data.course}</p>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e3a8a; font-weight: 600;">📝 Next Step:</p>
            <p style="margin: 4px 0 0; color: #1e40af; font-size: 14px;">Please login to your dashboard to download your <strong>Offer Letter</strong> and access your internship resources.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://www.ezyintern.com/login" style="display:inline-block; padding: 16px 32px; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">🚀 Access Your Dashboard</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">
            If you have any questions, please reach out to our support team.<br/>
            © 2026 EzyIntern. All rights reserved.
          </p>
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
    } else if (action === 'bulk_custom_mail') {
      mailOptions.subject = subject || 'Update from EzyIntern';
      mailOptions.html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">EzyIntern Announcement</h1>
          </div>
          <div style="padding: 40px 32px; color: #1e293b; line-height: 1.6;">
            <div style="font-size: 16px;">
              ${message.replace(/\n/g, '<br/>')}
            </div>
          </div>
          <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">EzyIntern — Empowering Future Careers</p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #cbd5e1;">This is an official communication from the EzyIntern platform.</p>
          </div>
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
