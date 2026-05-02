import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle2, ChevronLeft, ChevronRight, UserCheck, MessageSquare, ArrowRight, Building2 } from "lucide-react";
import { z } from "zod";
import { sendRegistrationEmail } from "@/lib/email";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Step = 1 | 2 | 3 | 4;

interface University { id: string; name: string }
interface College { id: string; name: string; university_id: string }

const baSubjects = [
  "B.A. (Ancient Indian History - AIH)", "B.A. (Anthropology)", "B.A. (Arabic)", "B.A. (Bengali)",
  "B.A. (Bhojpuri)", "B.A. (Dramatics)", "B.A. (Economics)", "B.A. (English)", "B.A. (Geography)",
  "B.A. (Home Science)", "B.A. (Hindi)", "B.A. (History)", "B.A. (Law)", "B.A. (Maithili)",
  "B.A. (Mathematics)", "B.A. (Music)", "B.A. (Pali)", "B.A. (Persian)", "B.A. (Philosophy)",
  "B.A. (Political Science)", "B.A. (Prakrit)", "B.A. (Psychology)", "B.A. (Rural Economics)",
  "B.A. (Sanskrit)", "B.A. (Sociology)", "B.A. (Statistics)", "B.A. (Urdu)", "Statistics"
];

const bscSubjects = [
  "B.Sc (Botany)", "B.Sc (Chemistry)", "B.Sc (Mathematics)", "B.Sc (Physics)", "B.Sc (Zoology)"
];

const bcomSubjects = [
  "B.Com Accounting and Finance", "B.Com (HRM)", "B.Com (Marketing)"
];

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [parentName, setParentName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [unis, setUnis] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [degree, setDegree] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [classSem, setClassSem] = useState("");
  const [session, setSession] = useState("");
  const [subject, setSubject] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [course, setCourse] = useState("");

  // Step 3
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [emRel, setEmRel] = useState("");

  // Step 4
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    supabase.from("universities").select("*").order("name").then(({ data }) => setUnis(data || []));
    supabase.from("internship_domains").select("*").order("name").then(({ data }) => setDomains(data || []));
    
    // Fetch payment config
    supabase.from("public_payment_config").select("*").maybeSingle().then(({ data }) => {
      setPaymentSettings(data);
    });

    // Load Razorpay Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!universityId) { setColleges([]); setCollegeId(""); return; }
    supabase.from("colleges").select("*").eq("university_id", universityId).order("name").then(({ data }) => setColleges(data || []));
    setCollegeId("");
  }, [universityId]);

  useEffect(() => {
    setDepartmentName("");
    setSubject("");
  }, [degree]);

  const validateStep = (): boolean => {
    if (step === 1) {
      const s = z.object({
        fullName: z.string().trim().min(2, "Full name is required").max(100),
        gender: z.string().min(1, "Select gender"),
        parentName: z.string().trim().min(2, "Parent/Guardian name is required").max(100),
        contact: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
        email: z.string().email("Enter a valid email").max(255),
      }).safeParse({ fullName, gender, parentName, contact, email });
      if (!s.success) { toast.error(s.error.issues[0].message); return false; }
    }
    if (step === 2) {
      if (!universityId || !collegeId || !degree || !classSem || !session || !rollNo || !course) {
        toast.error("Please fill all required academic fields"); return false;
      }
    }
    if (step === 3) {
      const s = z.object({
        emName: z.string().trim().min(2).max(100),
        emPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit emergency number"),
        emRel: z.string().min(1, "Select relationship"),
      }).safeParse({ emName, emPhone, emRel });
      if (!s.success) { toast.error(s.error.issues[0].message); return false; }
    }
    if (step === 4) {
      if (password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
      if (password !== confirmPw) { toast.error("Passwords do not match"); return false; }
      if (!agree) { toast.error("Please accept the Terms & Privacy Policy"); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => (Math.min(4, s + 1) as Step)); };
  const back = () => setStep((s) => (Math.max(1, s - 1) as Step));

  const handlePayment = async () => {
    if (!paymentSettings?.is_active) return true;

    return new Promise((resolve) => {
      const options = {
        key: paymentSettings.razorpay_key_id,
        amount: paymentSettings.amount_paise,
        currency: paymentSettings.currency,
        name: "EzyIntern",
        description: "Student Registration Fee",
        image: "/logo.png",
        handler: async function (response: any) {
          resolve({ success: true, payment_id: response.razorpay_payment_id });
        },
        prefill: {
          name: fullName,
          email: email,
          contact: contact
        },
        theme: { color: "#4F46E5" },
        modal: {
          ondismiss: async function () {
            await supabase.from("payment_cancelled").insert({
              user_email: email,
              user_phone: contact,
              amount: paymentSettings.amount_paise,
              reason: "User dismissed payment modal",
              metadata: { 
                fullName, 
                gender,
                parentName,
                email,
                contact,
                university: unis.find(u => u.id === universityId)?.name,
                college: colleges.find(c => c.id === collegeId)?.name,
                degree,
                department: departmentName,
                subject,
                session,
                semester: classSem,
                rollNo,
                course,
                emName,
                emPhone,
                emRel
              }
            });
            resolve({ success: false });
          }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async function (response: any) {
        await supabase.from("payment_cancelled").insert({
          user_email: email,
          user_phone: contact,
          amount: paymentSettings.amount_paise,
          reason: response.error.description,
          metadata: {
            errorCode: response.error.code,
            fullName, 
            gender,
            parentName,
            email,
            contact,
            university: unis.find(u => u.id === universityId)?.name,
            college: colleges.find(c => c.id === collegeId)?.name,
            degree,
            department: departmentName,
            subject,
            session,
            semester: classSem,
            rollNo,
            course,
            emName,
            emPhone,
            emRel
          }
        });
        toast.error(`Payment failed: ${response.error.description}`);
        resolve({ success: false });
      });
      rzp.open();
    });
  };

  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    console.log("Submit started...");
    
    try {
      // 1. Handle Payment First
      let result: any = { success: true };
      if (paymentSettings?.is_active) {
        console.log("Starting payment process...");
        result = await handlePayment();
        console.log("Payment result:", result);
        if (!result.success) {
          setSubmitting(false);
          return;
        }
      }

      const redirectUrl = `${window.location.origin}/dashboard`;
      console.log("Starting Supabase signUp...");
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
      });
      
      if (error) {
        console.error("SignUp error:", error);
        throw error;
      }
      console.log("SignUp successful for user:", data.user?.id);
      const userId = data.user?.id;
      if (!userId) throw new Error("Signup failed");

      // 2. Log successful payment if applicable
      if (paymentSettings?.is_active && result?.payment_id) {
        console.log("Logging successful payment...");
        const { error: payError } = await supabase.from("payment_success").insert({
          user_id: userId,
          payment_id: result.payment_id,
          amount_paise: paymentSettings.amount_paise,
          email: email,
          full_name: fullName
        });
        if (payError) console.error("Payment logging error:", payError);
      }

      const regId = `EZY-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Helper to get names from IDs
      const universityName = unis.find(u => u.id === universityId)?.name || "";
      const collegeName = colleges.find(c => c.id === collegeId)?.name || "";

      // Save everything to the unified 'students' table
      console.log("Inserting student data for user:", userId);
      const studentData = {
        id: userId,
        email: email,
        full_name: fullName,
        gender: gender,
        parent_name: parentName,
        contact_number: contact,
        university_name: universityName,
        college_name: collegeName,
        course: course,
        internship_domain: course, // Mapping course to domain for admin panel
        degree: degree,
        department: departmentName,
        class_semester: classSem,
        academic_session: session,
        roll_number: rollNo,
        emergency_name: emName,
        emergency_contact: emPhone,
        emergency_relation: emRel,
        status: 'Active',
        registration_id: regId,
        metadata: { subject: subject }
      };
      console.log("Student Data:", studentData);

      const { error: insertError } = await supabase.from("students").insert(studentData);
      
      if (insertError) {
        console.error("Student insertion error:", insertError);
        toast.error(`Database Error: ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      console.log("Student data inserted successfully");

      // Send registration confirmation email
      sendRegistrationEmail({
        to: email,
        fullName,
        email,
        contact,
        registrationId: regId,
        university: universityName,
        college: collegeName,
        degree,
        department: departmentName,
        course,
        session,
        semester: classSem,
      });

      // Keep profiles sync for auth consistency
      console.log("Upserting profile for user:", userId);
      const { error: pError } = await supabase.from("profiles").upsert({ 
        id: userId, 
        full_name: fullName, 
        email: email,
        contact_number: contact,
        gender: gender,
        parent_name: parentName
      });

      if (pError) {
        console.error("Profile upsert error:", pError);
      } else {
        console.log("Profile upserted successfully");
      }

      setSuccess(true);
      toast.success("Registration complete!");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNav />
        <main className="flex-1 gradient-soft flex items-center justify-center py-16">
          <Card className="max-w-md mx-4 p-10 text-center shadow-elegant animate-fade-in-up">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <CheckCircle2 className="size-9 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Registration Successful!</h1>
            <p className="text-muted-foreground mb-6">Your EzyIntern account has been created. You can now sign in to access your dashboard.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Home</Button>
              <Button variant="hero" className="flex-1" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            </div>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const progress = (step / 4) * 100;
  const stepLabels = ["Personal", "Academic", "Emergency", "Security"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="flex-1 gradient-soft py-10 md:py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto p-6 md:p-10 shadow-elegant animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex size-14 items-center justify-center rounded-xl overflow-hidden mb-3 shadow-soft">
                <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">Student Registration</h1>
              <p className="text-sm text-muted-foreground">Complete your registration for the UGC-mandated internship program</p>
            </div>

            <div className="mb-8">
              <Progress value={progress} className="h-2 mb-3" />
              <div className="flex justify-between text-xs">
                {stepLabels.map((l, i) => (
                  <div key={l} className={`flex items-center gap-1.5 ${step >= i + 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${step > i + 1 ? "bg-primary text-primary-foreground" : step === i + 1 ? "bg-primary/15 border border-primary text-primary" : "bg-muted text-muted-foreground"}`}>{step > i + 1 ? "✓" : i + 1}</span>
                    <span className="hidden sm:inline">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold">Personal Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name as per records" /></div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-2">
                      {["Male", "Female", "Other"].map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value={g} id={`g-${g}`} /><span className="text-sm">{g}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2"><Label>Parent / Guardian Name *</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Contact Number *</Label><Input value={contact} onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" /></div>
                  <div className="md:col-span-2 space-y-2"><Label>Email Address *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold">Academic Information</h2>
                {unis.length === 0 && (
                  <p className="text-xs bg-accent/10 border border-accent/30 rounded-md p-3 text-muted-foreground">
                    No universities have been added yet. The Super Admin will populate universities and colleges from the admin dashboard.
                  </p>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>University Name *</Label>
                    <Select value={universityId} onValueChange={setUniversityId}>
                      <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                      <SelectContent>{unis.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>College Name *</Label>
                    <Select value={collegeId} onValueChange={setCollegeId} disabled={!universityId}>
                      <SelectTrigger><SelectValue placeholder={universityId ? "Select college" : "Select university first"} /></SelectTrigger>
                      <SelectContent>{colleges.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Degree *</Label>
                    <RadioGroup value={degree} onValueChange={setDegree} className="flex gap-4 pt-2">
                      {["UG", "PG"].map((d) => (
                        <label key={d} className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value={d} id={`d-${d}`} /><span className="text-sm">{d}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select value={departmentName} onValueChange={(val) => { setDepartmentName(val); setSubject(""); }} disabled={!degree}>
                      <SelectTrigger><SelectValue placeholder={degree ? "Select department" : "Select degree first"} /></SelectTrigger>
                      <SelectContent>
                        {degree === "UG" ? (
                          <>
                            <SelectItem value="B.A.">B.A.</SelectItem>
                            <SelectItem value="B.Sc">B.Sc</SelectItem>
                            <SelectItem value="B.Com">B.Com</SelectItem>
                          </>
                        ) : degree === "PG" ? (
                          <>
                            <SelectItem value="M.A.">M.A.</SelectItem>
                            <SelectItem value="M.Sc">M.Sc</SelectItem>
                            <SelectItem value="M.Com">M.Com</SelectItem>
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    {departmentName === "B.A." || departmentName === "B.Sc" || departmentName === "B.Com" ? (
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {departmentName === "B.A." && baSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          {departmentName === "B.Sc" && bscSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          {departmentName === "B.Com" && bcomSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject manually" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Session *</Label>
                    <Select value={session} onValueChange={setSession}>
                      <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                      <SelectContent>
                        {["2023-2027", "2024-2028", "2025-2029"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class / Semester *</Label>
                    <Select value={classSem} onValueChange={setClassSem}>
                      <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <SelectItem key={s} value={`Semester ${s}`}>Semester {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>University Roll Number *</Label><Input value={rollNo} onChange={(e) => setRollNo(e.target.value)} /></div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Select Domain *</Label>
                    <Select value={course} onValueChange={setCourse}>
                      <SelectTrigger><SelectValue placeholder="Select internship domain" /></SelectTrigger>
                      <SelectContent>
                        {domains.map((d: any) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold">Emergency Contact</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Emergency Contact Name *</Label><Input value={emName} onChange={(e) => setEmName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Emergency Contact Number *</Label><Input value={emPhone} onChange={(e) => setEmPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" /></div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Relationship *</Label>
                    <Select value={emRel} onValueChange={setEmRel}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>{["Father", "Mother", "Brother", "Sister", "Guardian", "Friend"].map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold">Account Security</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg bg-muted/50 border border-border">
                  <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    I agree to the <a className="text-primary font-semibold">Terms of Service</a> and <a className="text-primary font-semibold">Privacy Policy</a>. I understand that internship organisation details, roll number verification, and administrative fields will be managed by platform administrators.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button variant="ghost" onClick={back} disabled={step === 1}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              {step < 4 ? (
                <Button variant="hero" onClick={next}>Next <ChevronRight className="size-4" /></Button>
              ) : (
                <Button variant="accent" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />} Complete Registration
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in here</Link>
            </p>

            <div className="mt-8 pt-6 border-t border-border">
              <a 
                href="https://whatsapp.com/channel/0029VbC9lvi3bbV8TS7TbB00" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 p-4 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-all border border-green-200 group"
              >
                <div className="size-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="size-6" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Official Channel</p>
                  <p className="text-sm font-bold">Join EzyIntern WhatsApp Channel</p>
                </div>
              </a>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Register;
