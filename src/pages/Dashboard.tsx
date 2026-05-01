import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, GraduationCap, Phone, ShieldCheck, Download, FileText, ExternalLink, Calendar, MapPin, Award, Briefcase, Mail, Globe, BookOpen, CheckCircle2, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [academic, setAcademic] = useState<any>(null);
  const [emergency, setEmergency] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cert, setCert] = useState<any>(null);
  const [isOfferLetterOpen, setIsOfferLetterOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const offerLetterRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const impersonateId = localStorage.getItem("impersonate_id");
      const uid = impersonateId || session.user.id;
      const isImpersonating = !!impersonateId;

      const [s, r, c, ss] = await Promise.all([
        supabase.from("students").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("certificates").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("system_settings").select("*"),
      ]);
      const roles = r.data || [];
      const ok = roles.some((x: any) => x.role === "admin" || x.role === "super_admin");
      setIsAdmin(ok);
      
      // If super admin and NOT impersonating, redirect to admin panel
      if (ok && !isImpersonating) {
        navigate("/admin");
        return;
      }

      let studentData = s.data;

      // Fallback: If no record in 'students' table, try fetching from legacy tables
      if (!studentData) {
        const [p, ai, ec] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
          supabase.from("academic_info").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("emergency_contacts").select("*").eq("user_id", uid).maybeSingle(),
        ]);
        
        if (p.data) {
          studentData = {
            ...p.data,
            university_name: ai.data?.university_name,
            college_name: ai.data?.college_name,
            course: ai.data?.course,
            degree: ai.data?.degree,
            department: ai.data?.department,
            class_semester: ai.data?.class_semester,
            academic_session: ai.data?.academic_session,
            roll_number: ai.data?.roll_number,
            emergency_name: ec.data?.contact_name,
            emergency_contact: ec.data?.contact_number,
            emergency_relation: ec.data?.relationship
          };
        }
      }

      setProfile(studentData);
      setCert(c.data);
      setSystemSettings(ss.data || []);
      
      // Fetch live classes
      const { data: clsData } = await supabase.from("classes").select("*, internship_domains(name)").order("scheduled_at", { ascending: true });
      if (clsData) {
        const domainName = studentData?.internship_domain;
        const relevantClasses = clsData.filter(c => c.is_active !== false && (!c.domain_id || c.internship_domains?.name === domainName));
        setLiveClasses(relevantClasses);
      }

      setLoading(false);
    })();
  }, [navigate]);

  const downloadCert = async () => {
    if (!certRef.current) return;
    setGenerating(true);
    
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.top = "-9999px";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "297mm";
    
    const clone = certRef.current.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(clone, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4"); // Portrait for new certificate format
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_${profile?.full_name?.replace(/\s+/g, "_")}.pdf`);
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error("Download failed");
    } finally {
      document.body.removeChild(wrapper);
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!offerLetterRef.current) return;
    setGenerating(true);
    
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.top = "-9999px";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "210mm";
    
    const clone = offerLetterRef.current.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EzyIntern_Offer_Letter_${profile?.full_name?.replace(/\s+/g, "_")}.pdf`);
      toast.success("Offer letter downloaded successfully!");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      document.body.removeChild(wrapper);
      setGenerating(false);
    }
  };

  const isServiceEnabled = (key: string) => {
    const s = systemSettings.find(x => x.key === key);
    return s ? s.is_enabled : true;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg overflow-hidden bg-white border border-slate-100">
              <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:block">Student Portal</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary gap-2" onClick={() => {
              const el = document.getElementById('profile-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <User className="size-4" />
              <span className="">Profile</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary gap-2" onClick={() => setIsOfferLetterOpen(true)}>
              <FileText className="size-4" />
              <span className="">Offer Letter</span>
            </Button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2" onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}>
              <LogOut className="size-4" />
              <span className="">Logout</span>
            </Button>
          </div>

        </div>
      </header>

      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className="size-16 md:size-20 rounded-2xl gradient-hero flex items-center justify-center text-white text-3xl font-bold shadow-elegant">
                {profile?.full_name?.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Howdy, {profile?.full_name?.split(" ")[0]}!</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">Student Dashboard</span>
                  <span className="size-1 rounded-full bg-muted-foreground/30"></span>
                  <span className="text-primary font-medium">Registration ID: {profile?.registration_id || "—"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {localStorage.getItem("impersonate_id") && (
                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => { localStorage.removeItem("impersonate_id"); window.location.reload(); }}>
                  Exit Preview
                </Button>
              )}
              {isAdmin && !localStorage.getItem("impersonate_id") && (
                <Button variant="outline" className="shadow-sm border-primary/20 hover:bg-primary/5 gap-2" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="size-4 text-primary" /> Admin Panel
                </Button>
              )}
              <Button variant="hero" className="gap-2 shadow-lg" onClick={() => setIsOfferLetterOpen(true)}>
                <FileText className="size-4" /> Offer Letter
              </Button>
            </div>
          </div>

          <div id="profile-section" className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 shadow-elegant border-none bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <User className="size-20 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4"><User className="size-5 text-primary" /> Personal Profile</h3>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Full Name</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.full_name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{profile?.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Contact Number</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.contact_number || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Gender</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.gender || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Parent / Guardian Name</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.parent_name || profile?.father_name || "—"}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 shadow-elegant border-none bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <GraduationCap className="size-20 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4"><GraduationCap className="size-5 text-primary" /> Academic Information</h3>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">University Name</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.university_name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">College Name</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.college_name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Degree Program</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.degree || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Department</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.department || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Major / Subject</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.metadata?.subject || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Academic Session</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.academic_session || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Class / Semester</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.class_semester || profile?.class_sem || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">University Roll No</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.roll_number || "—"}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">Internship Domain</p>
                    <p className="text-base font-black text-primary">{profile?.course || profile?.internship_domain || "—"}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-8 shadow-elegant border-none bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Phone className="size-20 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4"><Phone className="size-5 text-primary" /> Emergency Details</h3>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Contact Name</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.emergency_name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Contact Phone</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.emergency_contact || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Relationship</p>
                    <p className="text-sm font-bold text-slate-800">{profile?.emergency_relation || "—"}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-none bg-gradient-to-br from-primary to-accent text-white shadow-elegant">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
                    <Award className="size-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Status: Active</h4>
                    <p className="text-xs text-white/80 mt-1 leading-relaxed">You are currently enrolled in the internship program. Your progress is being tracked by our team.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 shadow-elegant border-none bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Briefcase className="size-20" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-3">Support & Help</h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-sm">Need help with your internship or have questions about the portal? Our support team is here to assist you 24/7.</p>
                  <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-white gap-2 w-full">
                    <ExternalLink className="size-4" /> Contact Support
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-6">
            <Card className="p-8 shadow-elegant border-none bg-white overflow-hidden relative border-t-4 border-t-primary">
              <div className="absolute -bottom-6 -right-6 opacity-10">
                <FileText className="size-32 text-primary" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">Internship Documents</h3>
                <p className="text-muted-foreground text-sm mb-8 max-w-2xl">Access and download your official internship documents. Your offer letter is available immediately, and your certificate will be generated upon successful completion of the program.</p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="default" className="bg-primary hover:bg-primary/90 h-12 px-6 shadow-md gap-2" onClick={() => setIsOfferLetterOpen(true)}>
                    <Download className="size-5" /> Download Offer Letter
                  </Button>
                  {isServiceEnabled('certificates') && (
                    cert ? (
                      <Button variant="hero" className="h-12 px-6 gap-2" onClick={() => setIsCertOpen(true)}>
                        <Award className="size-5" /> View & Download Certificate
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-12 px-6 bg-slate-100 border-dashed border-slate-300 gap-2 cursor-not-allowed opacity-60 text-slate-500" disabled>
                        <Award className="size-5" /> Certificate Not Ready
                      </Button>
                    )
                  )}
                </div>
                {isServiceEnabled('certificates') && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    {!cert ? (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Loader2 className="size-4 text-primary animate-spin" /> 
                        Your internship is currently in progress. The certificate will be issued automatically after the evaluation phase.
                      </p>
                    ) : (
                      <p className="text-sm text-green-600 font-bold flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> 
                        Congratulations! Your internship certificate has been issued and is ready for download.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {isServiceEnabled('live_classes') && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="size-6 text-primary" /> Live Learning Sessions</h2>
                <div className="h-px flex-1 mx-6 bg-slate-200 hidden md:block"></div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{liveClasses.length} Scheduled</Badge>
              </div>

              {liveClasses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {liveClasses.map(c => {
                    let embedUrl = c.url;
                    if (c.link_type === 'youtube') {
                      if (c.url.includes('watch?v=')) {
                        embedUrl = c.url.replace('watch?v=', 'embed/');
                      } else if (c.url.includes('youtu.be/')) {
                        embedUrl = c.url.replace('youtu.be/', 'youtube.com/embed/');
                      }
                    }

                    return (
                      <Card key={c.id} className="overflow-hidden border-none shadow-elegant flex flex-col group hover:-translate-y-2 transition-all duration-500 bg-white">
                        <div className="p-3 text-[10px] text-center font-black text-white uppercase tracking-[0.2em] bg-slate-900">
                          {new Date(c.scheduled_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                        </div>
                        
                        {c.link_type === 'youtube' ? (
                          <div className="relative w-full aspect-video bg-black shadow-inner">
                            <iframe 
                              src={embedUrl} 
                              className="absolute inset-0 w-full h-full border-0" 
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            ></iframe>
                          </div>
                        ) : (
                          <div className="w-full aspect-video bg-indigo-50 flex items-center justify-center flex-col gap-3 p-6 text-center border-b border-indigo-100">
                            <div className="size-16 rounded-full bg-white flex items-center justify-center text-primary shadow-elegant group-hover:scale-110 transition-transform duration-500">
                              <ExternalLink className="size-8" />
                            </div>
                            <p className="font-bold text-sm text-indigo-900">Live Virtual Session</p>
                          </div>
                        )}
                        
                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">{c.internship_domains?.name || "General"}</span>
                            <span className="size-1 rounded-full bg-slate-300"></span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{c.link_type} Session</span>
                          </div>
                          <h3 className="font-bold text-lg leading-tight mb-6 flex-1 text-slate-900">{c.title}</h3>
                          
                          {c.link_type === 'meet' ? (
                            <a href={c.url} target="_blank" rel="noreferrer" className="w-full block">
                              <Button className="w-full h-11 bg-primary hover:bg-primary/90 gap-2 shadow-lg transition-all"><ExternalLink className="size-4" /> Join Live Meeting</Button>
                            </a>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Learning Session</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-16 text-center border-none shadow-elegant bg-white/80 backdrop-blur-sm">
                  <div className="size-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <BookOpen className="size-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">Stay Tuned for Classes</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-3 leading-relaxed">There are currently no live sessions scheduled for your internship domain. We'll update this section soon!</p>
                </Card>
              )}
            </div>
          )}

        </div>
      </main>

      <footer className="py-8 bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} EzyIntern Portal. All rights reserved.</p>
        </div>
      </footer>

      <Dialog open={isOfferLetterOpen} onOpenChange={setIsOfferLetterOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-2xl font-bold">Offer Letter Preview</DialogTitle>
              <DialogDescription>Review your official internship offer letter</DialogDescription>
            </div>
            <Button variant="hero" size="sm" className="gap-2" onClick={downloadPDF} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download PDF
            </Button>
          </DialogHeader>
          
          <ScrollArea className="max-h-[75vh] p-10 bg-slate-100">
              <div 
                ref={offerLetterRef}
                className="w-full max-w-[210mm] bg-white shadow-2xl p-[12mm] md:p-[15mm] text-slate-900 font-sans leading-snug min-h-[297mm] flex flex-col relative overflow-hidden"
                style={{ height: 'auto' }}
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-32 select-none">
                  <img src="/logo.png" alt="Watermark" className="w-[85%] max-w-[500px] h-auto object-contain opacity-[0.15] grayscale" crossOrigin="anonymous" />
                </div>

                {/* Header */}
                <div className="-mx-[12mm] md:-mx-[15mm] -mt-[12mm] md:-mt-[15mm] mb-6 relative z-10">
                  <img src="/offer-letter-header.png" alt="Official Header" className="w-full h-auto block" />
                </div>

                <div className="flex justify-between text-[13px] font-bold mb-6 relative z-10">
                  <p>Letter Ref. No.: <span className="font-black text-slate-900">EZY/2026/INT/{10000 + (parseInt(profile?.registration_id?.split('-').pop() || "0", 16) % 1000) + 1}</span></p>
                  <p>Date: <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                </div>

                <div className="text-[14px] space-y-1 mb-8 relative z-10">
                  <p>To,</p>
                  <p className="font-bold text-slate-900 uppercase">{profile?.full_name}</p>
                  <p>University Roll Number: <span className="font-bold">{profile?.roll_number}</span></p>
                  <p>College / Institution: <span className="font-bold">{profile?.college_name}</span></p>
                </div>

                <div className="text-[14px] space-y-4 relative z-10 leading-relaxed">
                  <p className="font-bold">Dear Candidate,</p>
                  <p className="text-justify">
                    We are pleased to accept your application and formally offer you an internship at <span className="font-bold">Ezyintern SDP Technology Private Limited (Ezyintern)</span>. 
                    Our internship programmes are designed in full alignment with <span className="font-bold">NEP-2020, AICTE and UGC Internship Guidelines</span>, and your university's specific internship framework.
                  </p>

                  <div className="py-4 space-y-2">
                    <p className="font-bold mb-2">Your internship details are as follows:</p>
                    {[
                      { l: "Name of the Student", v: profile?.full_name },
                      { l: "University Roll Number", v: profile?.roll_number },
                      { l: "College / Institution", v: profile?.college_name },
                      { l: "Department & Semester", v: `${profile?.department || profile?.degree} — ${profile?.class_semester || profile?.class_sem || "Semester V"}` },
                      { l: "Internship Domain", v: profile?.course || profile?.internship_domain || "General Training" },
                      { l: "Internship Duration", v: "120 Hours" },
                      { l: "Mode of Internship", v: "Online (as approved by College)" },
                      { l: "Internship Start Date", v: new Date(profile?.created_at || Date.now()).toLocaleDateString('en-GB') },
                      { l: "Expected End Date", v: new Date(new Date(profile?.created_at || Date.now()).getTime() + 30*24*60*60*1000).toLocaleDateString('en-GB') },
                      { l: "Stipend", v: "Not Applicable — Academic Programme" }
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-[220px_20px_1fr] items-start">
                        <span className="text-slate-800">• {row.l}</span>
                        <span className="">:</span>
                        <span className="font-bold text-slate-900">{row.v}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-justify">
                    Please report to us on your start date as per the schedule above and bring this letter along with the <span className="font-bold">Consent Letter</span> issued by your College. 
                    We also request that you inform your <span className="font-bold">College Internship Nodal Officer (CINO)</span> upon receiving this acceptance letter. 
                    During the programme, you are required to maintain the minimum required attendance and complete all tasks and assignments given by your mentor.
                  </p>

                  <p className="">We look forward to a meaningful and enriching internship experience and appreciate your interest in <span className="font-bold">Ezyintern</span>.</p>

                  <div className="mt-auto pt-6 -mx-[12mm] md:-mx-[15mm] -mb-[12mm] md:-mb-[15mm] relative z-10">
                    <img src="/offer-letter-footer.png" alt="Official Signature and Accreditations" className="w-full h-auto block" />
                  </div>
                </div>
              </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      <Dialog open={isCertOpen} onOpenChange={setIsCertOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-2xl font-bold">Internship Certificate</DialogTitle>
              <DialogDescription>Official certificate for completion of internship</DialogDescription>
            </div>
            <Button variant="hero" size="sm" className="gap-2" onClick={downloadCert} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download Certificate
            </Button>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] p-10 bg-slate-100">
            <div className="flex justify-center">
              <div 
                ref={certRef}
                className="w-full max-w-[210mm] bg-white shadow-2xl p-[12mm] md:p-[15mm] text-slate-900 font-sans leading-snug min-h-[297mm] relative overflow-hidden flex flex-col"
                style={{ height: 'auto' }}
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 mt-20 select-none opacity-[0.05]">
                  <div className="bg-[#5AA3E6] rounded-[3rem] w-[450px] h-[450px] flex items-center justify-center grayscale">
                    <span className="text-white font-black text-[300px] tracking-tighter leading-none">EI</span>
                  </div>
                </div>

                {/* Header */}
                <div className="-mx-[12mm] md:-mx-[15mm] -mt-[12mm] md:-mt-[15mm] mb-6 relative z-10">
                  <img src="/cert-header.png" alt="Certificate Header" className="w-full h-auto block" onError={(e) => {
                    (e.target as HTMLImageElement).src = '/offer-letter-header.png';
                  }} />
                </div>
                
                {/* Certificate Title & Text */}
                <div className="relative z-10 text-center space-y-1 mb-6">
                  <h1 className="text-2xl font-bold text-[#5AA3E6] mb-4">Certificate of Completion</h1>
                  <p className="text-[13px]">This is to certify that</p>
                  <p className="text-lg font-bold">Mr./Ms. {profile?.full_name},</p>
                  <p className="text-[13px]">S/o or D/o</p>
                  <p className="text-lg font-bold">{profile?.parent_name || profile?.father_name || "[Father's/Guardian's Name]"}</p>
                  <p className="text-[13px]">bearing University Registration/Enrolment No. <span className="font-bold">{profile?.registration_id}</span></p>
                  <p className="text-[13px]">of</p>
                  <p className="text-lg font-bold">{profile?.college_name}</p>
                  <p className="text-[13px]">Session {profile?.academic_session || "2024-25"}, with Major in <span className="font-bold">{profile?.degree}</span>,</p>
                  <p className="text-[13px]">has successfully completed his/her internship with our organisation.</p>
                </div>

                {/* Table 1 */}
                <div className="relative z-10 w-full border border-[#5AA3E6] mb-6 text-[12px]">
                  <div className="flex border-b border-[#5AA3E6]">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Internship Domain</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">{profile?.course}</div>
                  </div>
                  <div className="flex border-b border-[#5AA3E6]">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Internship Duration</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">From {new Date().toLocaleDateString('en-GB')} to {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div className="flex border-b border-[#5AA3E6]">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Total Hours Completed</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">120 Hours</div>
                  </div>
                  <div className="flex border-b border-[#5AA3E6]">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Mode of Internship</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">Offline / Online / Hybrid</div>
                  </div>
                  <div className="flex border-b border-[#5AA3E6]">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Overall Attendance Percentage</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">100%</div>
                  </div>
                  <div className="flex">
                    <div className="w-[40%] font-bold p-2 border-r border-[#5AA3E6] flex items-center justify-center text-center bg-white">Overall Marks Percentage</div>
                    <div className="w-[60%] p-2 flex items-center justify-center text-center bg-white/60">100%</div>
                  </div>
                </div>

                {/* Table 2 */}
                <div className="relative z-10 w-full mb-8">
                  <h3 className="text-[13px] font-bold text-[#5AA3E6] mb-1">Internship Performance Assessment</h3>
                  <div className="border border-[#5AA3E6] text-[12px]">
                    <div className="flex bg-[#5AA3E6] text-white font-bold">
                      <div className="w-[70%] p-2 border-r border-[#5AA3E6] text-center">Assessment Criteria</div>
                      <div className="w-[30%] p-2 text-center">Rating</div>
                    </div>
                    <div className="flex bg-white/60">
                      <div className="w-[70%] p-3 border-r border-[#5AA3E6] text-center leading-snug">
                        Technical Knowledge & Application, Quality of Work & Task Completion, Initiative & Problem-Solving Ability, Communication & Interpersonal Skills, Punctuality, Discipline & Professional Conduct
                      </div>
                      <div className="w-[30%] p-3 flex flex-col items-center justify-center text-center text-[11px]">
                        <span className="font-bold">Outstanding</span> / Good / Satisfactory / Needs Improvement
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="-mx-[12mm] md:-mx-[15mm] -mb-[12mm] md:-mb-[15mm] relative z-10 mt-auto">
                  <div className="relative">
                    <img src="/cert-footer.png" alt="Certificate Footer" className="w-full h-auto block" onError={(e) => {
                      (e.target as HTMLImageElement).src = '/offer-letter-footer.png';
                    }} />
                    
                    {/* Verification Details Overlay - positioned on right side where empty space is */}
                    <div className="absolute bottom-40 right-6 md:right-8 flex items-center gap-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-[#5AA3E6]/20 shadow-sm z-20">
                      {/* QR Code */}
                      <div className="relative size-[68px] shrink-0 border border-slate-200 p-1 bg-white rounded-lg">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.ezyintern.com/certificate-verification/${cert?.certificate_id || 'EZY-DEMO-1001'}`} alt="QR Code" className="w-full h-full" crossOrigin="anonymous" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-[#5AA3E6] text-white font-black text-[9px] px-1 py-0.5 rounded-sm shadow-sm leading-none">EI</div>
                        </div>
                      </div>
                      
                      {/* Text Info */}
                      <div className="text-[11px] leading-snug space-y-1">
                        <p className="text-slate-800 flex items-center">
                          <span className="font-bold w-24">Reference No.</span> 
                          <span className="font-black mx-1">:</span>
                          <span className="text-[#5AA3E6] font-black tracking-wide">EZY/2026/INT/{10000 + (parseInt(profile?.registration_id?.split('-').pop() || "0", 16) % 1000) + 1}</span>
                        </p>
                        <p className="text-slate-800 flex items-center">
                          <span className="font-bold w-24">Certificate ID</span> 
                          <span className="font-black mx-1">:</span>
                          <span className="text-[#5AA3E6] font-black tracking-wide">{cert?.certificate_id || `CERT-${(profile?.id || '0').substring(0, 8).toUpperCase()}`}</span>
                        </p>
                        <p className="text-slate-800 flex items-center">
                          <span className="font-bold w-24">Date of Issue</span> 
                          <span className="font-black mx-1">:</span>
                          <span className="text-[#5AA3E6] font-black">{new Date().toLocaleDateString('en-GB')}</span>
                        </p>
                        <div className="pt-1 mt-1 border-t border-slate-200">
                          <p className="text-[9px] text-slate-600 font-bold mb-0.5">To verify this certificate, go to our site:</p>
                          <p className="text-[10px] text-[#5AA3E6] font-black tracking-wide">www.ezyintern.com/certificate-verification</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
};

export default Dashboard;
