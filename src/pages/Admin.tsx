import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Award, Users, Building2, Edit, Eye, MoreHorizontal, Shield, Mail, Phone, User, BookOpen, Heart, LogIn, Ban, CheckCircle2, Download, Briefcase, UserPlus, Filter, Search, Calendar, ToggleLeft, ToggleRight, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [unis, setUnis] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cancelledPayments, setCancelledPayments] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [myPermissions, setMyPermissions] = useState<any>(null);

  // Selection & Filters
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  // Pagination
  const [studentPage, setStudentPage] = useState(0);
  const [studentTotalCount, setStudentTotalCount] = useState(0);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const pageSize = 20;

  // Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Form States
  const [staffEmail, setStaffEmail] = useState("");
  const [certProgram, setCertProgram] = useState("Web Development");
  const [certDuration, setCertDuration] = useState("3 Months");

  // CRUD States
  const [newUni, setNewUni] = useState("");
  const [collegeUni, setCollegeUni] = useState("");
  const [newCollege, setNewCollege] = useState("");
  const [newDomain, setNewDomain] = useState("");

  // Class Scheduler States
  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassType, setNewClassType] = useState("youtube");
  const [newClassUrl, setNewClassUrl] = useState("");
  const [newClassSchedule, setNewClassSchedule] = useState("");
  const [newClassDomain, setNewClassDomain] = useState("all");

  const fetchStudents = async () => {
    setIsStudentsLoading(true);
    try {
      let query = supabase
        .from("students")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      if (domainFilter !== "all") {
        query = query.eq("internship_domain", domainFilter);
      }
      if (dateFilter) {
        query = query.gte("created_at", `${dateFilter}T00:00:00`).lte("created_at", `${dateFilter}T23:59:59`);
      }

      const from = studentPage * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count, error } = await query.range(from, to);
      
      if (error) throw error;

      // Filter out super admins
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
      const superAdminIds = (roles || []).map(r => r.user_id);
      
      setStudents((data || []).filter(student => !superAdminIds.includes(student.id)));
      setStudentTotalCount(count || 0);
    } catch (err) {
      console.error("Fetch Students Error:", err);
      toast.error("Failed to load students");
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch only admin/super_admin roles and their profiles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      const staffUserIds = (adminRoles || [])
        .filter(r => r.role === 'admin' || r.role === 'super_admin')
        .map(r => r.user_id);

      const [p, u, c, ce, dm, cl, ss, ap, ps, pc] = await Promise.all([
        supabase.from("profiles").select("*").in("id", staffUserIds),
        supabase.from("universities").select("*").order("name"),
        supabase.from("colleges").select("*, universities(name)").order("name"),
        supabase.from("certificates").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("internship_domains").select("*").order("name"),
        supabase.from("classes").select("*, internship_domains(name)").order("scheduled_at", { ascending: true }),
        supabase.from("system_settings").select("*"),
        supabase.from("admin_permissions").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("payment_success").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("payment_cancelled").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      const rolesMap = (adminRoles || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.role);
        return acc;
      }, {});

      // Staff list (Admins from profiles)
      const staffList = (p.data || []).map(prof => ({ 
        ...prof, 
        roles: rolesMap[prof.id] || [] 
      }));

      // Role check for current user
      const currentRoles = rolesMap[session.user.id] || [];
      const isSuper = currentRoles.includes("super_admin");
      
      if (isSuper) {
        navigate("/super-admin");
        return;
      }

      setStaff(staffList.filter(st => !st.roles.includes("super_admin")));
      setUnis(u.data || []);
      setColleges(c.data || []);
      setCerts(ce.data || []);
      setDomains(dm.data || []);
      setClassesList(cl.data || []);
      setSystemSettings(ss.data || []);
      setMyPermissions(ap.data);
      setPayments(ps.data || []);
      setCancelledPayments(pc.data || []);

      // Initial students fetch
      await fetchStudents();
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchStudents();
    }
  }, [studentPage, searchTerm, domainFilter, dateFilter]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const rolesList = (roles || []).map((r: any) => r.role);
      
      if (rolesList.includes("super_admin")) {
        navigate("/super-admin");
        return;
      }
      
      const ok = rolesList.includes("admin");
      setAllowed(ok);
      if (ok) await loadAll();
    })();
  }, [navigate]);

  // Bulk Actions
  const handleBulkCertificate = async () => {
    if (selectedStudents.length === 0) return toast.error("Select at least one student");
    setProcessing(true);
    try {
      const issues = selectedStudents.map(id => {
        const s = students.find(x => x.id === id);
        const certId = s.registration_id || `EZY-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        return {
          user_id: id,
          student_name: s.full_name,
          internship_name: certProgram,
          duration: certDuration,
          certificate_id: certId,
          status: "Active"
        };
      });

      const { error } = await supabase.from("certificates").insert(issues);
      if (error) throw error;

      toast.success(`Successfully generated ${selectedStudents.length} certificates!`);
      setSelectedStudents([]);
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) setSelectedStudents([]);
    else setSelectedStudents(filteredStudents.map(s => s.id));
  };


  // Actions
  const toggleBlock = async (user: any) => {
    const newStatus = user.status === "Blocked" ? "Active" : "Blocked";
    await supabase.from("students").update({ status: newStatus }).eq("id", user.id);
    toast.success(`User ${newStatus}`);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("students").delete().eq("id", id);
    toast.success("Deleted");
    loadAll();
  };

  const handleAddStaff = async () => {
    if (!staffEmail.trim()) return toast.error("Enter email");
    const { data } = await supabase.from("profiles").select("id").eq("email", staffEmail.trim()).single();
    if (!data) return toast.error("User not found");
    await supabase.from("user_roles").insert({ user_id: data.id, role: "admin" });
    toast.success("Admin added");
    setStaffEmail(""); setIsAddStaffOpen(false); loadAll();
  };

  // CRUD for Domains/Unis
  const addDomain = async () => {
    if (!newDomain.trim()) return;
    await supabase.from("internship_domains").insert({ name: newDomain.trim() });
    setNewDomain(""); loadAll();
  };

  const delDomain = async (id: string) => {
    if (!confirm("Delete domain?")) return;
    await supabase.from("internship_domains").delete().eq("id", id);
    loadAll();
  };

  const addUni = async () => {
    if (!newUni.trim()) return;
    const logo = prompt("Enter University Logo URL (optional):") || "";
    await supabase.from("universities").insert({ name: newUni.trim(), logo_url: logo });
    setNewUni(""); loadAll();
  };

  const delUni = async (id: string) => {
    if (!confirm("Delete university?")) return;
    await supabase.from("universities").delete().eq("id", id);
    loadAll();
  };

  const addCollege = async () => {
    if (!newCollege.trim() || !collegeUni) return toast.error("Enter name and select university");
    await supabase.from("colleges").insert({ name: newCollege.trim(), university_id: collegeUni });
    setNewCollege(""); loadAll();
    toast.success("College added");
  };

  const delCollege = async (id: string) => {
    if (!confirm("Delete college?")) return;
    await supabase.from("colleges").delete().eq("id", id);
    loadAll();
  };

  const handleLogoUpload = async (file: File, uniId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uniId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      await supabase.from("universities").update({ logo_url: publicUrl }).eq("id", uniId);
      toast.success("Logo uploaded!");
      loadAll();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    }
  };

  const editUni = async (u: any) => {
    const newName = prompt("Enter new name:", u.name);
    if (newName !== null) {
      await supabase.from("universities").update({ name: newName }).eq("id", u.id);
      loadAll();
    }
  };

  // Filtering Logic
  const filteredStudents = students;

  // Class Logic
  const addClass = async () => {
    if (!newClassTitle || !newClassUrl || !newClassSchedule) return toast.error("Please fill all required fields");
    try {
      await supabase.from("classes").insert({
        title: newClassTitle,
        link_type: newClassType,
        url: newClassUrl,
        scheduled_at: new Date(newClassSchedule).toISOString(),
        domain_id: newClassDomain === "all" ? null : newClassDomain
      });
      toast.success("Class Scheduled!");
      setNewClassTitle(""); setNewClassUrl(""); setNewClassSchedule("");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const delClass = async (id: string) => {
    if (!confirm("Delete this scheduled class?")) return;
    await supabase.from("classes").delete().eq("id", id);
    toast.success("Class deleted");
    loadAll();
  };

  const toggleClassActive = async (cl: any) => {
    const newStatus = !cl.is_active;
    await supabase.from("classes").update({ is_active: newStatus }).eq("id", cl.id);
    toast.success(newStatus ? "Class enabled — students can now see it" : "Class disabled — hidden from students");
    loadAll();
  };

  const isServiceEnabled = (key: string) => {
    const s = systemSettings.find(x => x.key === key);
    if (s && !s.is_enabled) return false;
    
    // Check granular per-admin permission
    if (myPermissions) {
      if (key === 'bulk_certification' && myPermissions.can_manage_certificates === false) return false;
      if (key === 'live_classes' && myPermissions.can_manage_classes === false) return false;
      if (key === 'students' && myPermissions.can_manage_students === false) return false;
      if (key === 'settings' && myPermissions.can_manage_institutions === false) return false;
    }
    
    return true;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!allowed) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div><h1 className="text-3xl font-bold">Admin Panel</h1><p className="text-muted-foreground">Unified Management & Bulk Certification</p></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => navigate("/register")}><UserPlus className="size-4" /> Add Student</Button>
            </div>
          </div>

          <Tabs defaultValue="students">
            <TabsList className="bg-muted/50 p-1 border rounded-2xl flex flex-wrap gap-1">
                {isServiceEnabled('students') && <TabsTrigger value="students" className="gap-2"><Users className="size-4" /> Students</TabsTrigger>}
                {isServiceEnabled('bulk_certification') && <TabsTrigger value="bulk" className="gap-2"><Award className="size-4" /> Bulk Certification</TabsTrigger>}
                {isServiceEnabled('live_classes') && <TabsTrigger value="classes" className="gap-2"><BookOpen className="size-4" /> Live Classes</TabsTrigger>}
                <TabsTrigger value="payments" className="gap-2"><DollarSign className="size-4" /> Transactions</TabsTrigger>
                <TabsTrigger value="leads" className="gap-2"><UserPlus className="size-4" /> Leads</TabsTrigger>
                {isServiceEnabled('settings') && <TabsTrigger value="settings" className="gap-2"><Building2 className="size-4" /> System Settings</TabsTrigger>}
              </TabsList>

            <TabsContent value="students">
              <Card className="p-6 border-none shadow-elegant mb-6 bg-card/50 backdrop-blur-sm">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                  <Select value={domainFilter} onValueChange={setDomainFilter}>
                    <SelectTrigger className="gap-2"><Briefcase className="size-4" /><SelectValue placeholder="All Domains" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Domains</SelectItem>{domains.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input type="date" className="pl-9" value={dateFilter} onChange={e => setDateFilter(e.target.value)} /></div>
                  <Button variant="outline" className="gap-2" onClick={() => { setSearchTerm(""); setDateFilter(""); setDomainFilter("all"); }}><Filter className="size-4" /> Clear Filters</Button>
                </div>
              </Card>

              <Card className="overflow-hidden border-none shadow-elegant">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Joined Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isStudentsLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : (
                      <>
                        {filteredStudents.map(s => (
                          <TableRow key={s.id} className="group hover:bg-muted/20">
                            <TableCell><Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">{s.full_name?.charAt(0)}</div>
                                <div><div className="font-bold text-sm">{s.full_name}</div><div className="text-[10px] text-muted-foreground">{s.email}</div></div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-[9px] uppercase">{s.internship_domain || "Unassigned"}</Badge></TableCell>
                            <TableCell><div className="text-xs font-medium">{s.college_name || "—"}</div></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="size-8 p-0"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 shadow-elegant">
                                  <DropdownMenuItem onClick={() => { setSelectedUser(s); setIsViewDialogOpen(true); }} className="gap-2"><Eye className="size-4" /> View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleBlock(s)} className={`gap-2 ${s.status === "Blocked" ? "text-green-600" : "text-destructive"}`}>
                                    {s.status === "Blocked" ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />} {s.status === "Blocked" ? "Unblock" : "Block"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(s.id)} className="gap-2 text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredStudents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-medium italic">No interns found matching your filters.</TableCell></TableRow>}
                      </>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="p-4 bg-muted/10 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground font-medium">
                    Showing {studentTotalCount === 0 ? 0 : studentPage * pageSize + 1} to {Math.min(studentTotalCount, (studentPage + 1) * pageSize)} of {studentTotalCount} students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={studentPage === 0 || isStudentsLoading}
                      onClick={() => setStudentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(studentTotalCount / pageSize) }, (_, i) => i)
                        .filter(pageNum => {
                          const totalPages = Math.ceil(studentTotalCount / pageSize);
                          if (totalPages <= 7) return true;
                          return Math.abs(pageNum - studentPage) <= 2 || pageNum === 0 || pageNum === totalPages - 1;
                        })
                        .map((pageNum, i, arr) => (
                          <div key={pageNum} className="flex items-center gap-1">
                            {i > 0 && pageNum - arr[i-1] > 1 && <span className="text-muted-foreground px-1 text-xs">...</span>}
                            <Button
                              variant={studentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="size-8 p-0"
                              onClick={() => setStudentPage(pageNum)}
                              disabled={isStudentsLoading}
                            >
                              {pageNum + 1}
                            </Button>
                          </div>
                        ))
                      }
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={(studentPage + 1) * pageSize >= studentTotalCount || isStudentsLoading}
                      onClick={() => setStudentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="bulk">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6 border-none shadow-elegant bg-primary/5">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Award className="size-5 text-primary" /> Bulk Certificate Generator</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label>Internship Program</Label>
                        <Select value={certProgram} onValueChange={setCertProgram}>
                          <SelectTrigger><SelectValue placeholder="Select Domain" /></SelectTrigger>
                          <SelectContent>
                            {domains.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Duration</Label><Input value={certDuration} onChange={e => setCertDuration(e.target.value)} placeholder="e.g. 3 Months" /></div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/20">
                      <div><p className="text-sm font-bold">{selectedStudents.length} Students Selected</p><p className="text-xs text-muted-foreground">Selected students will receive certificates instantly.</p></div>
                      <Button variant="hero" className="gap-2" disabled={processing || selectedStudents.length === 0} onClick={handleBulkCertificate}>
                        {processing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Generate & Issue
                      </Button>
                    </div>
                  </Card>

                  <Card className="overflow-hidden border-none shadow-elegant">
                    <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                      <h3 className="font-bold text-sm">Select Students for Certification</h3>
                      <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" /><Input className="pl-8 h-8 text-xs" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    </div>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={toggleSelectAll} /></TableHead><TableHead>Student</TableHead><TableHead>Domain</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredStudents.map(s => (
                            <TableRow key={s.id} className={selectedStudents.includes(s.id) ? "bg-primary/5" : ""}>
                              <TableCell><Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>
                              <TableCell className="font-medium text-xs">{s.full_name}</TableCell>
                              <TableCell className="text-[10px] text-muted-foreground">{s.internship_domain}</TableCell>
                            </TableRow>
                          ))}
                          {filteredStudents.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No students found.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6 border-none shadow-elegant">
                    <h4 className="font-bold mb-4">Recent Certificates</h4>
                    <ScrollArea className="h-[400px]">
                      {certs.slice(0, 10).map(c => (
                        <div key={c.id} className="p-3 border-b last:border-0 hover:bg-muted/30 rounded transition-colors">
                          <div className="font-bold text-sm">{c.student_name}</div>
                          <div className="text-[10px] text-muted-foreground flex justify-between mt-1"><span>{c.certificate_id}</span><span>{new Date(c.created_at).toLocaleDateString()}</span></div>
                        </div>
                      ))}
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="classes">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 border-none shadow-elegant">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BookOpen className="size-5 text-primary" /> Schedule New Class</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Target Domain</Label>
                        <Select value={newClassDomain} onValueChange={setNewClassDomain}>
                          <SelectTrigger><SelectValue placeholder="Target Audience" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Interns (Universal)</SelectItem>
                            {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Link Type</Label>
                        <Select value={newClassType} onValueChange={setNewClassType}>
                          <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube Live/Video Embed</SelectItem>
                            <SelectItem value="meet">Google Meet / Zoom Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Class Title / Topic</Label>
                        <Input value={newClassTitle} onChange={e => setNewClassTitle(e.target.value)} placeholder="e.g. Introduction to React JS" />
                      </div>

                      <div className="space-y-2">
                        <Label>Class Link URL</Label>
                        <Input value={newClassUrl} onChange={e => setNewClassUrl(e.target.value)} placeholder="https://..." />
                      </div>

                      <div className="space-y-2">
                        <Label>Scheduled Date & Time</Label>
                        <Input type="datetime-local" value={newClassSchedule} onChange={e => setNewClassSchedule(e.target.value)} />
                      </div>

                      <Button className="w-full gap-2 mt-2" onClick={addClass}><Calendar className="size-4" /> Schedule Class</Button>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card className="overflow-hidden border-none shadow-elegant h-full">
                    <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                      <h3 className="font-bold">Scheduled Classes</h3>
                      <Badge variant="secondary">{classesList.length} Upcoming</Badge>
                    </div>
                    <ScrollArea className="h-[500px]">
                      {classesList.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No classes scheduled yet.</div>
                      ) : (
                        <Table>
                          <TableHeader><TableRow><TableHead>Date & Time</TableHead><TableHead>Title</TableHead><TableHead>Target</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {classesList.map(cl => (
                              <TableRow key={cl.id} className={!cl.is_active ? "opacity-50" : ""}>
                                <TableCell className="whitespace-nowrap font-medium text-xs">
                                  {new Date(cl.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </TableCell>
                                <TableCell className="font-bold">{cl.title}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{cl.internship_domains?.name || "All Interns"}</Badge></TableCell>
                                <TableCell>
                                  {cl.link_type === 'youtube' ? (
                                    <Badge className="bg-red-500 hover:bg-red-600">YouTube</Badge>
                                  ) : (
                                    <Badge className="bg-blue-500 hover:bg-blue-600">Meet</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {cl.is_active !== false ? (
                                    <Badge className="bg-green-500 text-white text-[10px]">Active</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Disabled</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title={cl.is_active !== false ? "Disable class" : "Enable class"}
                                      onClick={() => toggleClassActive(cl)}
                                      className={cl.is_active !== false ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-green-600"}
                                    >
                                      {cl.is_active !== false ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => delClass(cl.id)}><Trash2 className="size-4 text-destructive" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="payments">
              <div className="space-y-6">
                <Card className="p-6 border-none shadow-elegant">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-green-600"><CheckCircle2 className="size-5" /> Successful Transactions</h3>
                    <Badge variant="hero" className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-4 py-1.5 font-bold">Total: {payments.length}</Badge>
                  </div>
                  <ScrollArea className="h-[450px]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student Details</TableHead><TableHead>Transaction ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Profile</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {payments.map(pay => (
                          <TableRow key={pay.id}>
                            <TableCell className="text-[10px] font-medium">{new Date(pay.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-800">{pay.metadata?.full_name || pay.user_email}</div>
                              <div className="text-[10px] text-muted-foreground">{pay.user_email} • {pay.metadata?.college || 'N/A'}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] font-mono">{pay.payment_id}</Badge></TableCell>
                            <TableCell className="font-black text-slate-800">₹{pay.amount / 100}</TableCell>
                            <TableCell><Badge className="bg-green-500 text-[10px] uppercase">{pay.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="size-8 p-0" 
                                onClick={() => {
                                  const student = students.find(s => s.email === pay.user_email);
                                  if (student) {
                                    setSelectedUser(student);
                                    setIsViewDialogOpen(true);
                                  } else {
                                    toast.error("Student record not found in database");
                                  }
                                }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads">
              <Card className="p-6 border-none shadow-elegant">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600"><UserPlus className="size-5" /> Conversion Leads</h3>
                    <p className="text-xs text-muted-foreground font-medium">Students who reached checkout but didn't complete payment</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 border-none px-4 py-1.5 font-bold">Leads: {cancelledPayments.length}</Badge>
                </div>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student Details</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {cancelledPayments.map(cp => (
                        <TableRow key={cp.id}>
                          <TableCell className="text-[10px] font-medium">{new Date(cp.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-800">{cp.metadata?.fullName || cp.user_email}</div>
                            <div className="text-[10px] text-muted-foreground">{cp.user_email} • {cp.user_phone}</div>
                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{cp.metadata?.college || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="font-bold">₹{(cp.amount || 0) / 100}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">{cp.reason}</Badge></TableCell>
                          <TableCell className="text-right">
                            <a href={`mailto:${cp.user_email}`} className="inline-flex items-center justify-center size-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                              <Mail className="size-4" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cancelledPayments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No leads available at the moment.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-none shadow-elegant">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Briefcase className="size-5 text-primary" /> Internship Domains</h3>
                  <div className="flex gap-2 mb-4"><Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="New Domain..." /><Button variant="hero" onClick={addDomain}><Plus className="size-4" /></Button></div>
                  <div className="flex flex-wrap gap-2">{domains.map(d => <Badge key={d.id} variant="secondary" className="pl-3 pr-1 py-1 gap-2">{d.name} <Button size="sm" variant="ghost" className="size-4 p-0 h-auto" onClick={() => delDomain(d.id)}><Trash2 className="size-3" /></Button></Badge>)}</div>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}><DialogContent><DialogHeader><DialogTitle>Add Administrator</DialogTitle></DialogHeader>
        <div className="p-4 space-y-4"><div className="space-y-2"><Label>User Email</Label><Input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} /></div></div>
        <DialogFooter><Button onClick={handleAddStaff}>Grant Access</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}><DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
        {selectedUser && (
          <ScrollArea className="max-h-[60vh] p-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Full Name</Label><p className="font-bold">{selectedUser.full_name}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Email</Label><p>{selectedUser.email}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Domain</Label><p>{selectedUser.internship_domain}</p></div>
              </div>
              <div className="space-y-4">
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">College</Label><p>{selectedUser.college_name}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Roll No</Label><p>{selectedUser.roll_number}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Joined</Label><p>{new Date(selectedUser.created_at).toLocaleDateString()}</p></div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent></Dialog>

      <SiteFooter />
    </div>
  );
};

export default Admin;
