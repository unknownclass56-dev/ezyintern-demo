import { supabase } from "@/integrations/supabase/client";

/**
 * Send a registration confirmation email to a newly registered student.
 */
export async function sendRegistrationEmail(data: {
  to: string;
  fullName: string;
  email: string;
  contact: string;
  registrationId: string;
  university: string;
  college: string;
  degree: string;
  department: string;
  course: string;
  session: string;
  semester: string;
}) {
  try {
    const { error } = await supabase.functions.invoke("resend-email", {
      body: {
        type: "registration_confirmation",
        to: data.to,
        data,
      },
    });
    if (error) console.error("Registration email error:", error);
    else console.log("Registration email sent to:", data.to);
  } catch (err) {
    console.error("Failed to send registration email:", err);
  }
}

/**
 * Send a certificate-ready notification email to a student.
 */
export async function sendCertificateEmail(data: {
  to: string;
  studentName: string;
  programme: string;
  certificateId: string;
}) {
  try {
    const { error } = await supabase.functions.invoke("resend-email", {
      body: {
        type: "certificate_generated",
        to: data.to,
        data,
      },
    });
    if (error) console.error("Certificate email error:", error);
    else console.log("Certificate email sent to:", data.to);
  } catch (err) {
    console.error("Failed to send certificate email:", err);
  }
}
