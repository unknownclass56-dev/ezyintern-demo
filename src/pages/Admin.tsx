import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
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
import { Loader2, Plus, Trash2, Award, Users, Building2, Edit, Eye, MoreHorizontal, Shield, Mail, Phone, User, BookOpen, Heart, LogIn, Ban, CheckCircle2, Download, Briefcase, UserPlus, Filter, Search, Calendar, ToggleLeft, ToggleRight, DollarSign, GraduationCap, Bell, FileText, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import AIAssignmentBuilder from "@/components/AIAssignmentBuilder";
import { Sparkles } from "lucide-react";
import { sendCertificateEmail } from "@/lib/email";

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false);

  // Notification States
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeMessage, setNewNoticeMessage] = useState("");
  const [newNoticeTarget, setNewNoticeTarget] = useState("all");
  const [newNoticeTargetUserId, setNewNoticeTargetUserId] = useState("");

  // Selection & Filters
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [uniFilter, setUniFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [payStartDate, setPayStartDate] = useState("");
  const [payEndDate, setPayEndDate] = useState("");
  const [payCollegeFilter, setPayCollegeFilter] = useState("all");

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

  const logAdminAction = async (action_type: string, entity_type: string, description: string, metadata: any = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from("admin_logs").insert({
        user_id: session.user.id,
        admin_email: session.user.email,
        action_type,
        entity_type,
        description,
        metadata,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Log Action Error:", err);
    }
  };

  const handleSendNotification = async () => {
    if (!newNoticeTitle.trim() || !newNoticeMessage.trim()) return toast.error("Please fill title and message");
    if (newNoticeTarget === "specific" && !newNoticeTargetUserId.trim()) return toast.error("Please provide a student ID");
    
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let target_uid = null;
      if (newNoticeTarget === "specific") {
        const { data: studentCheck } = await supabase.from("students").select("id").or(`registration_id.eq.${newNoticeTargetUserId},id.eq.${newNoticeTargetUserId}`).maybeSingle();
        if (!studentCheck) {
          setProcessing(false);
          return toast.error("Student not found with this ID or Registration ID");
        }
        target_uid = studentCheck.id;
      }

      const { error } = await supabase.from("notifications").insert({
        title: newNoticeTitle,
        message: newNoticeMessage,
        target_type: newNoticeTarget,
        target_user_id: target_uid,
        created_by: session?.user.id
      });

      if (error) throw error;

      toast.success("Notification sent successfully!");
      setNewNoticeTitle("");
      setNewNoticeMessage("");
      setNewNoticeTargetUserId("");
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("students").update({
        full_name: editData.full_name,
        email: editData.email,
        contact_number: editData.contact_number,
        gender: editData.gender,
        parent_name: editData.parent_name,
        university_name: editData.university_name,
        college_name: editData.college_name,
        degree: editData.degree,
        department: editData.department,
        academic_session: editData.academic_session,
        class_semester: editData.class_semester,
        roll_number: editData.roll_number,
        internship_domain: editData.internship_domain,
        registration_id: editData.registration_id,
        joining_date: editData.joining_date,
        completion_date: editData.completion_date,
        internship_duration: editData.internship_duration,
        emergency_name: editData.emergency_name,
        emergency_relation: editData.emergency_relation,
        emergency_contact: editData.emergency_contact
      }).eq("id", editData.id);

      if (error) throw error;
      
      await logAdminAction('UPDATE', 'student', `Updated student details: ${editData.full_name} (Admin)`, { student_id: editData.id });
      
      toast.success("Student updated successfully!");
      setIsEditDialogOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

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
      if (uniFilter !== "all") {
        query = query.eq("university_name", uniFilter);
      }
      if (collegeFilter !== "all") {
        query = query.eq("college_name", collegeFilter);
      }
      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }
      if (dateFilter && !startDate && !endDate) {
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

      // Guard: if no staffUserIds, skip profiles fetch to avoid Supabase error
      const profilesQuery = staffUserIds.length > 0
        ? supabase.from("profiles").select("*").in("id", staffUserIds)
        : supabase.from("profiles").select("*").limit(0);

      const [p, u, c, ce, dm, cl, ss, ap, ps, pc, notifs, asgnResult] = await Promise.all([
        profilesQuery,
        supabase.from("universities").select("*").order("name"),
        supabase.from("colleges").select("*, universities(name)").order("name"),
        supabase.from("certificates").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("internship_domains").select("*").order("name"),
        supabase.from("classes").select("*, internship_domains(name)").order("scheduled_at", { ascending: true }),
        supabase.from("system_settings").select("*"),
        supabase.from("admin_permissions").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("payment_success").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("payment_cancelled").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("assignments").select("*, assignment_submissions(id)").order("created_at", { ascending: false })
      ]);
      
      console.log("Fetched Payments:", ps.data?.length || 0);
      console.log("Fetched Leads:", pc.data?.length || 0);

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
      setNotifications(notifs.data || []);
      setAssignments(asgnResult.data || []);

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
  }, [studentPage, searchTerm, domainFilter, dateFilter, startDate, endDate, uniFilter, collegeFilter]);

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

      await logAdminAction(
        'BULK_ACTION', 
        'certificate', 
        `Issued ${selectedStudents.length} certificates for ${certProgram} (Admin)`,
        { student_count: selectedStudents.length, program: certProgram, duration: certDuration }
      );

      toast.success(`Successfully generated ${selectedStudents.length} certificates!`);

      // Send certificate notification emails
      for (const issue of issues) {
        const s = students.find(x => x.id === issue.user_id);
        if (s?.email) {
          sendCertificateEmail({
            to: s.email,
            studentName: issue.student_name,
            programme: certProgram,
            certificateId: issue.certificate_id,
          });
        }
      }

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
    
    await logAdminAction(
      'UPDATE', 
      'student', 
      `${newStatus === "Blocked" ? "Blocked" : "Unblocked"} student ${user.full_name} (Admin)`,
      { student_id: user.id, status: newStatus }
    );

    toast.success(`User ${newStatus}`);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const user = students.find(s => s.id === id);
    await supabase.from("students").delete().eq("id", id);
    
    await logAdminAction(
      'DELETE', 
      'student', 
      `Deleted student ${user?.full_name || id} (Admin)`,
      { entity_id: id, name: user?.full_name }
    );

    toast.success("Deleted");
    loadAll();
  };

  const handleAddStaff = async () => {
    if (!staffEmail.trim()) return toast.error("Enter email");
    const { data } = await supabase.from("profiles").select("id").eq("email", staffEmail.trim()).single();
    if (!data) return toast.error("User not found");
    await supabase.from("user_roles").insert({ user_id: data.id, role: "admin" });
    
    await logAdminAction('CREATE', 'staff', `Granted admin access to ${staffEmail.trim()} (Admin)`, { user_id: data.id, email: staffEmail.trim() });
    
    toast.success("Admin added");
    setStaffEmail(""); setIsAddStaffOpen(false); loadAll();
  };

  // CRUD for Domains/Unis
  const addDomain = async () => {
    if (!newDomain.trim()) return;
    await supabase.from("internship_domains").insert({ name: newDomain.trim() });
    
    await logAdminAction('CREATE', 'domain', `Added internship domain: ${newDomain.trim()} (Admin)`);
    
    setNewDomain(""); loadAll();
  };

  const delDomain = async (id: string) => {
    if (!confirm("Delete domain?")) return;
    const domain = domains.find(d => d.id === id);
    await supabase.from("internship_domains").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'domain', `Deleted internship domain: ${domain?.name || id} (Admin)`);
    
    loadAll();
  };

  const addUni = async () => {
    if (!newUni.trim()) return;
    const logo = prompt("Enter University Logo URL (optional):") || "";
    await supabase.from("universities").insert({ name: newUni.trim(), logo_url: logo });
    
    await logAdminAction('CREATE', 'university', `Added university: ${newUni.trim()} (Admin)`);
    
    setNewUni(""); loadAll();
  };

  const delUni = async (id: string) => {
    if (!confirm("Delete university?")) return;
    const uni = unis.find(u => u.id === id);
    await supabase.from("universities").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'university', `Deleted university: ${uni?.name || id} (Admin)`);
    
    loadAll();
  };

  const addCollege = async () => {
    if (!newCollege.trim() || !collegeUni) return toast.error("Enter name and select university");
    await supabase.from("colleges").insert({ name: newCollege.trim(), university_id: collegeUni });
    
    const uniName = unis.find(u => u.id === collegeUni)?.name;
    await logAdminAction('CREATE', 'college', `Added college: ${newCollege.trim()} to ${uniName} (Admin)`);
    
    setNewCollege(""); loadAll();
    toast.success("College added");
  };

  const delCollege = async (id: string) => {
    if (!confirm("Delete college?")) return;
    const college = colleges.find(c => c.id === id);
    await supabase.from("colleges").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'college', `Deleted college: ${college?.name || id} (Admin)`);
    
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

  const exportToCSV = () => {
    if (students.length === 0) return toast.error("No data to export");
    
    const exportData = students.map(s => ({
      "Full Name": s.full_name,
      "Email": s.email,
      "Contact": s.contact_number,
      "University": s.university_name,
      "College": s.college_name,
      "Domain": s.internship_domain,
      "Roll No": s.roll_number,
      "Batch/Session": s.academic_session,
      "Semester": s.class_semester,
      "Parent Name": s.parent_name,
      "Emergency Contact": s.emergency_contact,
      "Status": s.status,
      "Joined Date": new Date(s.created_at).toLocaleDateString()
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Exported successfully!");
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

      await logAdminAction('CREATE', 'class', `Scheduled class: ${newClassTitle} (Admin)`, { title: newClassTitle, schedule: newClassSchedule });

      toast.success("Class Scheduled!");
      setNewClassTitle(""); setNewClassUrl(""); setNewClassSchedule("");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const delClass = async (id: string) => {
    if (!confirm("Delete this scheduled class?")) return;
    const cl = classesList.find(c => c.id === id);
    await supabase.from("classes").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'class', `Deleted scheduled class: ${cl?.title || id} (Admin)`);
    
    toast.success("Class deleted");
    loadAll();
  };

  const toggleClassActive = async (cl: any) => {
    const newStatus = !cl.is_active;
    await supabase.from("classes").update({ is_active: newStatus }).eq("id", cl.id);
    
    await logAdminAction('UPDATE', 'class', `${newStatus ? "Enabled" : "Disabled"} class: ${cl.title} (Admin)`, { class_id: cl.id, active: newStatus });
    
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

  const handleTransferLead = async (lead: any) => {
    if (!confirm(`Are you sure you want to transfer ${lead.metadata?.fullName || lead.user_email} to registered students? This will create a student account.`)) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-tasks', {
        body: { action: 'transfer_lead', leadId: lead.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Lead successfully transferred to registered students!");
      
      await logAdminAction(
        'TRANSFER', 
        'lead', 
        `Transferred lead ${lead.user_email} to registered students (Admin)`,
        { lead_id: lead.id, student_id: data.userId }
      );
      
      loadAll();
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.error(err.message || "Failed to transfer lead. Make sure the lead has a password recorded.");
    } finally {
      setProcessing(false);
    }
  };

  // Payment Filtering Logic
  const filteredPayments = payments.filter(pay => {
    // Date filter
    if (payStartDate) {
      const payDate = new Date(pay.created_at);
      const start = new Date(payStartDate);
      start.setHours(0, 0, 0, 0);
      if (payDate < start) return false;
    }
    if (payEndDate) {
      const payDate = new Date(pay.created_at);
      const end = new Date(payEndDate);
      end.setHours(23, 59, 59, 999);
      if (payDate > end) return false;
    }
    
    // College filter
    if (payCollegeFilter !== "all") {
      const student = students.find(s => s.email === pay.email);
      if (student?.college_name !== payCollegeFilter) return false;
    }
    
    return true;
  });

  const totalPaymentAmount = filteredPayments.reduce((sum, pay) => sum + ((pay.amount_paise || 0) / 100), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!allowed) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg overflow-hidden bg-white border border-slate-100">
              <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:block">Admin Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2" onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}>
              <LogIn className="size-4 rotate-180" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div><h1 className="text-3xl font-bold">Admin Panel</h1><p className="text-muted-foreground">Unified Management & Bulk Certification</p></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" onClick={exportToCSV}><Download className="size-4" /> Export CSV</Button>
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
                <TabsTrigger value="notifications" className="gap-2"><Bell className="size-4" /> Notifications</TabsTrigger>
                <TabsTrigger value="assignments" className="gap-2"><FileText className="size-4" /> Assignments</TabsTrigger>
                {isServiceEnabled('settings') && <TabsTrigger value="settings" className="gap-2"><Building2 className="size-4" /> System Settings</TabsTrigger>}
              </TabsList>

            <TabsContent value="assignments">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="size-5 text-primary" /> Manage Assignments</h2>
                  <Button className="gap-2" onClick={() => setIsAIBuilderOpen(true)}>
                    <Sparkles className="size-4" /> Create with AI
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignments.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-white rounded-xl shadow-sm border">
                      <FileText className="size-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-muted-foreground">No assignments have been created yet.</p>
                      <Button className="mt-4 gap-2" onClick={() => setIsAIBuilderOpen(true)}>
                        <Sparkles className="size-4" /> Create with AI
                      </Button>
                    </div>
                  ) : (
                    assignments.map(a => (
                      <Card key={a.id} className="p-6 relative overflow-hidden group hover:border-primary transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <FileText className="size-20" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{a.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{a.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Duration</p>
                            <p className="font-bold flex items-center gap-1.5 text-sm"><Clock className="size-3" /> {a.duration_minutes}m</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Marks</p>
                            <p className="font-bold flex items-center gap-1.5 text-sm"><Award className="size-3" /> {a.total_marks}</p>
                          </div>
                          <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Status</p>
                              <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Submissions</p>
                              <p className="font-bold">{a.assignment_submissions?.length || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button className="flex-1 gap-2" onClick={() => toast.info('Detailed submissions view coming soon!')}>
                            <Users className="size-4" /> Submissions
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 border-none shadow-elegant">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Bell className="size-5 text-primary" /> Send Notification</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Notice Title</Label>
                        <Input value={newNoticeTitle} onChange={e => setNewNoticeTitle(e.target.value)} placeholder="e.g. Important Update" />
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" value={newNoticeMessage} onChange={e => setNewNoticeMessage(e.target.value)} placeholder="Write your message here..."></textarea>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <Select value={newNoticeTarget} onValueChange={setNewNoticeTarget}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Students</SelectItem>
                            <SelectItem value="specific">Specific Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newNoticeTarget === "specific" && (
                        <div className="space-y-2">
                          <Label>Student Reg ID or UUID</Label>
                          <Input value={newNoticeTargetUserId} onChange={e => setNewNoticeTargetUserId(e.target.value)} placeholder="e.g. EZY-..." />
                        </div>
                      )}
                      <Button className="w-full gap-2" onClick={handleSendNotification} disabled={processing}>
                        {processing && <Loader2 className="size-4 animate-spin" />} Send Notification
                      </Button>
                    </div>
                  </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6 border-none shadow-elegant h-full flex flex-col">
                    <h3 className="text-lg font-bold mb-4">Recent Notifications</h3>
                    <ScrollArea className="flex-1 max-h-[500px]">
                      <div className="space-y-4">
                        {notifications.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground">No notifications sent yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-4 rounded-xl border bg-card/50">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold">{n.title}</h4>
                                <Badge variant="outline">{new Date(n.created_at).toLocaleDateString()}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{n.message}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Target: <Badge variant="secondary" className="text-[10px] uppercase ml-1">{n.target_type === 'all' ? 'All Students' : 'Specific Student'}</Badge></span>
                                {n.target_type === 'specific' && n.target_user_id && <span className="text-slate-400">User ID: {n.target_user_id.substring(0, 8)}...</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="students">
              <Card className="p-6 border-none shadow-elegant mb-6 bg-card/50 backdrop-blur-sm">
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  
                  <Select value={domainFilter} onValueChange={setDomainFilter}>
                    <SelectTrigger className="gap-2"><Briefcase className="size-4" /><SelectValue placeholder="All Domains" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Domains</SelectItem>{domains.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>

                  <Select value={uniFilter} onValueChange={setUniFilter}>
                    <SelectTrigger className="gap-2"><Building2 className="size-4" /><SelectValue placeholder="All Universities" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Universities</SelectItem>{unis.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>

                  <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                    <SelectTrigger className="gap-2"><GraduationCap className="size-4" /><SelectValue placeholder="All Colleges" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colleges</SelectItem>
                      {colleges.filter(c => uniFilter === "all" || c.university_id === unis.find(u => u.name === uniFilter)?.id).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Date</Label>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input type="date" className="pl-9" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">End Date</Label>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input type="date" className="pl-9" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => { 
                    setSearchTerm(""); setDateFilter(""); setDomainFilter("all"); 
                    setUniFilter("all"); setCollegeFilter("all"); setStartDate(""); setEndDate(""); 
                  }}><Filter className="size-4" /> Reset Filters</Button>
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
                                  <DropdownMenuItem onClick={() => { setEditData({...s}); setIsEditDialogOpen(true); }} className="gap-2 text-primary"><Edit className="size-4" /> Edit Details</DropdownMenuItem>
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
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-green-600"><CheckCircle2 className="size-5" /> Successful Transactions</h3>
                      <Button variant="ghost" size="sm" onClick={loadAll} className="size-8 p-0"><Loader2 className={`size-4 ${loading ? 'animate-spin' : ''}`} /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 px-4 py-1.5 font-black text-sm">TOTAL AMOUNT: ₹{totalPaymentAmount.toLocaleString()}</Badge>
                      <Badge variant="hero" className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-4 py-1.5 font-bold">Count: {filteredPayments.length}</Badge>
                    </div>
                  </div>
 
                  {/* Payment Filters */}
                  <Card className="p-4 border-none shadow-sm bg-muted/20 mb-6">
                    <div className="grid md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Date</Label>
                        <Input type="date" className="h-9" value={payStartDate} onChange={e => setPayStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">End Date</Label>
                        <Input type="date" className="h-9" value={payEndDate} onChange={e => setPayEndDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Filter by College</Label>
                        <Select value={payCollegeFilter} onValueChange={setPayCollegeFilter}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="All Colleges" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Colleges</SelectItem>
                            {Array.from(new Set(students.map(s => s.college_name).filter(Boolean))).map(college => (
                              <SelectItem key={college} value={college}>{college}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => { setPayStartDate(""); setPayEndDate(""); setPayCollegeFilter("all"); }}>
                        <Filter className="size-3" /> Reset
                      </Button>
                    </div>
                  </Card>
                  <ScrollArea className="h-[450px]">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student Details</TableHead><TableHead>College</TableHead><TableHead>Transaction ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Profile</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredPayments.map(pay => {
                          const student = students.find(s => s.email === pay.email);
                          return (
                            <TableRow key={pay.id}>
                              <TableCell className="text-[10px] font-medium">{new Date(pay.created_at).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="font-bold text-slate-800">{pay.full_name || pay.email}</div>
                                <div className="text-[10px] text-muted-foreground">{pay.email}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{student?.college_name || "—"}</div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] font-mono">{pay.payment_id}</Badge></TableCell>
                              <TableCell className="font-black text-slate-800">₹{(pay.amount_paise || 0) / 100}</TableCell>
                              <TableCell><Badge className="bg-green-500 text-[10px] uppercase">Captured</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="size-8 p-0" 
                                  onClick={() => {
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
                          );
                        })}
                        {filteredPayments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No transactions found matching filters.</TableCell></TableRow>}
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
                            <div className="text-[10px] text-muted-foreground">{cp.user_email} • {cp.user_phone || cp.metadata?.contact || 'No phone'}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-500 border-indigo-100 leading-none py-0.5">{cp.metadata?.college || 'No College'}</Badge>
                              <Badge variant="outline" className="text-[8px] font-black uppercase text-emerald-500 border-emerald-100 leading-none py-0.5">{cp.metadata?.course || 'No Domain'}</Badge>
                              {cp.metadata?.semester && <Badge variant="outline" className="text-[8px] font-black uppercase text-amber-500 border-amber-100 leading-none py-0.5">{cp.metadata.semester}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">₹{(cp.amount || 0) / 100}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">{cp.reason}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="size-8 p-0" 
                                onClick={() => {
                                  setSelectedUser(cp);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <a href={`mailto:${cp.user_email}`} className="inline-flex items-center justify-center size-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <Mail className="size-4" />
                              </a>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="size-8 p-0 rounded-full hover:bg-emerald-600 hover:text-white transition-all"
                                onClick={() => handleTransferLead(cp)}
                                title="Transfer to Registered Students"
                                disabled={processing}
                              >
                                <UserPlus className="size-4" />
                              </Button>
                            </div>
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

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}><DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
        <div className="bg-primary p-6 text-white">
          <DialogTitle className="text-2xl font-black">
            {selectedUser?.full_name || selectedUser?.metadata?.fullName || "Profile Details"}
          </DialogTitle>
          <p className="text-primary-foreground/80 text-xs mt-1">
            {selectedUser?.registration_id ? `Reg ID: ${selectedUser.registration_id}` : "Lead / Pending Registration"}
          </p>
        </div>
        {selectedUser && (
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-8">
              {/* Personal Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <User className="size-3" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Gender</Label><p className="text-sm font-bold">{selectedUser.gender || selectedUser.metadata?.gender || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Email</Label><p className="text-sm font-bold truncate">{selectedUser.email || selectedUser.user_email || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Contact</Label><p className="text-sm font-bold">{selectedUser.contact_number || selectedUser.user_phone || "—"}</p></div>
                  <div className="md:col-span-2"><Label className="text-[9px] uppercase text-muted-foreground font-bold">Parent / Guardian</Label><p className="text-sm font-bold">{selectedUser.parent_name || selectedUser.metadata?.parentName || "—"}</p></div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Academic Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <GraduationCap className="size-3" /> Academic Details
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2"><Label className="text-[9px] uppercase text-muted-foreground font-bold">University</Label><p className="text-sm font-bold">{selectedUser.university_name || selectedUser.metadata?.university || "—"}</p></div>
                  <div className="col-span-2"><Label className="text-[9px] uppercase text-muted-foreground font-bold">College</Label><p className="text-sm font-bold">{selectedUser.college_name || selectedUser.metadata?.college || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Degree</Label><p className="text-sm font-bold">{selectedUser.degree || selectedUser.metadata?.degree || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Department</Label><p className="text-sm font-bold">{selectedUser.department || selectedUser.metadata?.department || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Subject</Label><p className="text-sm font-bold">{selectedUser.metadata?.subject || selectedUser.metadata?.subject || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Session</Label><p className="text-sm font-bold">{selectedUser.academic_session || selectedUser.metadata?.session || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Semester</Label><p className="text-sm font-bold">{selectedUser.class_semester || selectedUser.metadata?.semester || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Roll Number</Label><p className="text-sm font-bold">{selectedUser.roll_number || selectedUser.metadata?.rollNo || "—"}</p></div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-[9px] uppercase text-primary font-bold">Internship Domain</Label>
                    <p className="text-base font-black text-slate-900">{selectedUser.internship_domain || selectedUser.metadata?.course || "—"}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Emergency Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <Phone className="size-3" /> Emergency Contacts
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Contact Name</Label><p className="text-sm font-bold">{selectedUser.emergency_name || selectedUser.metadata?.emName || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Relationship</Label><p className="text-sm font-bold">{selectedUser.emergency_relation || selectedUser.metadata?.emRel || "—"}</p></div>
                  <div><Label className="text-[9px] uppercase text-muted-foreground font-bold">Contact Phone</Label><p className="text-sm font-bold">{selectedUser.emergency_contact || selectedUser.metadata?.emPhone || "—"}</p></div>
                </div>
              </div>

              {selectedUser.reason && (
                <>
                  <Separator className="bg-slate-100" />
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <Label className="text-[9px] uppercase text-red-600 font-bold">Lead Status / Payment Issue</Label>
                    <p className="text-sm font-bold text-red-700">{selectedUser.reason}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent></Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
          <div className="bg-primary p-6 text-white">
            <DialogTitle className="text-2xl font-black">Edit Student Details</DialogTitle>
            <p className="text-primary-foreground/80 text-xs mt-1">Update personal and academic records</p>
          </div>
          {editData && (
            <ScrollArea className="max-h-[70vh]">
              <form onSubmit={handleEditStudentSubmit} className="p-8 space-y-8">
                {/* Personal Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <User className="size-3" /> Personal Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={editData.full_name || ""} onChange={e => setEditData({...editData, full_name: e.target.value})} required /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} required /></div>
                    <div className="space-y-1"><Label className="text-xs">Contact Number</Label><Input value={editData.contact_number || ""} onChange={e => setEditData({...editData, contact_number: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Gender</Label>
                      <Select value={editData.gender || ""} onValueChange={v => setEditData({...editData, gender: v})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2"><Label className="text-xs">Parent / Guardian</Label><Input value={editData.parent_name || ""} onChange={e => setEditData({...editData, parent_name: e.target.value})} /></div>
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                {/* Academic Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <GraduationCap className="size-3" /> Academic Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-1"><Label className="text-xs">University</Label><Input value={editData.university_name || ""} onChange={e => setEditData({...editData, university_name: e.target.value})} /></div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">College</Label><Input value={editData.college_name || ""} onChange={e => setEditData({...editData, college_name: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Degree</Label><Input value={editData.degree || ""} onChange={e => setEditData({...editData, degree: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={editData.department || ""} onChange={e => setEditData({...editData, department: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Session</Label><Input value={editData.academic_session || ""} onChange={e => setEditData({...editData, academic_session: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Semester</Label><Input value={editData.class_semester || ""} onChange={e => setEditData({...editData, class_semester: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Roll Number</Label><Input value={editData.roll_number || ""} onChange={e => setEditData({...editData, roll_number: e.target.value})} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Internship Domain</Label>
                      <Select value={editData.internship_domain || ""} onValueChange={v => setEditData({...editData, internship_domain: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Domain" /></SelectTrigger>
                        <SelectContent>
                          {domains.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-100" />
 
                 {/* Internship Details Section */}
                 <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                     <Briefcase className="size-3" /> Internship Information
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1">
                       <Label className="text-xs">Intern ID (Registration ID)</Label>
                       <Input value={editData.registration_id || ""} onChange={e => setEditData({...editData, registration_id: e.target.value})} placeholder="e.g. EZY/2026/INT/10001" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs">Internship Duration</Label>
                       <Input value={editData.internship_duration || ""} onChange={e => setEditData({...editData, internship_duration: e.target.value})} placeholder="e.g. 1 Month / 120 Hours" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs">Date of Joining</Label>
                       <Input type="date" value={editData.joining_date || ""} onChange={e => setEditData({...editData, joining_date: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs">Date of Completion</Label>
                       <Input type="date" value={editData.completion_date || ""} onChange={e => setEditData({...editData, completion_date: e.target.value})} />
                     </div>
                   </div>
                 </div>
 
                 <Separator className="bg-slate-100" />
 
                 {/* Emergency Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Phone className="size-3" /> Emergency Contacts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1"><Label className="text-xs">Contact Name</Label><Input value={editData.emergency_name || ""} onChange={e => setEditData({...editData, emergency_name: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Relationship</Label><Input value={editData.emergency_relation || ""} onChange={e => setEditData({...editData, emergency_relation: e.target.value})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Contact Phone</Label><Input value={editData.emergency_contact || ""} onChange={e => setEditData({...editData, emergency_contact: e.target.value})} /></div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={processing}>{processing ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Save Changes</Button>
                </div>
              </form>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <footer className="py-8 bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} EzyIntern Admin. All rights reserved.</p>
        </div>
      </footer>

      <AIAssignmentBuilder
        open={isAIBuilderOpen}
        onClose={() => setIsAIBuilderOpen(false)}
        onSaved={() => { loadAll(); }}
      />
    </div>
  );
};

export default Admin;
