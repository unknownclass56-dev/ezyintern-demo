import { supabase } from "@/integrations/supabase/client";

/**
 * Send a registration confirmation email to a newly registered student.
 */
export async function sendRegistrationEmail(data: any) {
  try {
    const response = await fetch('/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registration_confirmation',
        to: data.to,
        data: data
      })
    });
    const result = await response.json();
    if (!result.success) console.error("Registration email error:", result.message);
    else console.log("Registration email sent to:", data.to);
  } catch (err) {
    console.error("Failed to send registration email:", err);
  }
}

/**
 * Send a certificate-ready notification email to a student.
 */
export async function sendCertificateEmail(data: any) {
  try {
    const response = await fetch('/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'certificate_generated',
        to: data.to,
        data: data
      })
    });
    const result = await response.json();
    if (!result.success) console.error("Certificate email error:", result.message);
    else console.log("Certificate email sent to:", data.to);
  } catch (err) {
    console.error("Failed to send certificate email:", err);
  }
}
