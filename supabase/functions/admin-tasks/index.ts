import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify the requester is an admin
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    if (!authHeader) {
      throw new Error("No auth token provided");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // 2. Parse request body
    const { action, leadId } = await req.json();

    if (action === "transfer_lead") {
      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from("payment_cancelled")
        .select("*")
        .eq("id", leadId)
        .single();
      
      if (leadError || !lead) throw new Error("Lead not found");

      const metadata = lead.metadata || {};
      const email = lead.user_email;
      const password = metadata.password;

      if (!password) {
        throw new Error("Lead metadata is missing password. Cannot transfer.");
      }

      // Create Auth User
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: metadata.fullName }
      });

      if (createError) throw createError;

      // Assign student role
      await supabase.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "student"
      });

      // Generate Registration ID
      const { data: lastStudent } = await supabase
        .from("students")
        .select("registration_id")
        .not("registration_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSeq = 10001;
      if (lastStudent?.registration_id) {
        const parts = lastStudent.registration_id.split('/');
        if (parts.length === 4) {
          const lastNum = parseInt(parts[3], 10);
          if (!isNaN(lastNum)) nextSeq = lastNum + 1;
        }
      }
      const regId = `EZY/${new Date().getFullYear()}/INT/${nextSeq}`;

      // Create Student Record
      const { error: studentError } = await supabase.from("students").insert({
        id: newUser.user.id,
        email: email,
        full_name: metadata.fullName,
        gender: metadata.gender,
        parent_name: metadata.parentName,
        contact_number: lead.user_phone,
        university_name: metadata.university,
        college_name: metadata.college,
        course: metadata.course,
        internship_domain: metadata.course,
        degree: metadata.degree,
        department: metadata.department,
        class_semester: metadata.semester,
        academic_session: metadata.session,
        roll_number: metadata.rollNo,
        emergency_name: metadata.emName,
        emergency_contact: metadata.emPhone,
        emergency_relation: metadata.emRel,
        status: 'Active',
        registration_id: regId,
        metadata: { subject: metadata.subject }
      });

      if (studentError) throw studentError;

      // Also update profiles
      await supabase.from("profiles").upsert({
        id: newUser.user.id,
        full_name: metadata.fullName,
        email: email,
        contact_number: lead.user_phone,
        gender: metadata.gender,
        parent_name: metadata.parentName
      });

      // Delete Lead
      await supabase.from("payment_cancelled").delete().eq("id", leadId);

      return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
