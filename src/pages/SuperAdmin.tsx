import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
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
import { 
  Loader2, Plus, Trash2, Award, Users, Building2, Edit, Eye, MoreHorizontal, 
  Shield, Mail, Phone, User, BookOpen, Heart, LogIn, Ban, CheckCircle2, 
  Download, Briefcase, UserPlus, Filter, Search, Calendar, ToggleLeft, 
  ToggleRight, TrendingUp, Activity, DollarSign, Clock, GraduationCap
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [unis, setUnis] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cancelledPayments, setCancelledPayments] = useState<any[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [uniqueVisitorCount, setUniqueVisitorCount] = useState(0);
  const [leadsSearchTerm, setLeadsSearchTerm] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testMailTo, setTestMailTo] = useState("");
  const [testMailSubject, setTestMailSubject] = useState("System Diagnostic");
  const [testMailBody, setTestMailBody] = useState("Hello! This is a test email from the EzyIntern Super Admin panel to verify SMTP settings.");
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsSearchTerm, setLogsSearchTerm] = useState("");

  // Selection & Filters
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [uniFilter, setUniFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");

  // Pagination
  const [studentPage, setStudentPage] = useState(0);
  const [studentTotalCount, setStudentTotalCount] = useState(0);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const pageSize = 20;

  // Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isPermsDialogOpen, setIsPermsDialogOpen] = useState(false);
  const [selectedAdminForPerms, setSelectedAdminForPerms] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetOptions, setResetOptions] = useState({
    students: true,
    payments: true,
    leads: true,
    certs: true,
    classes: false,
    institutions: false,
    domains: false
  });

  // Form States
  const [staffEmail, setStaffEmail] = useState("");
  const [certProgram, setCertProgram] = useState("Web Development");
  const [certDuration, setCertDuration] = useState("3 Months");

  // CRUD States
  const [newUni, setNewUni] = useState("");
  const [newCollege, setNewCollege] = useState("");
  const [collegeUni, setCollegeUni] = useState("");
  const [newDept, setNewDept] = useState("");
  const [deptCollege, setDeptCollege] = useState("");
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

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let query = supabase
        .from("admin_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (logsSearchTerm) {
        query = query.or(`admin_email.ilike.%${logsSearchTerm}%,description.ilike.%${logsSearchTerm}%,action_type.ilike.%${logsSearchTerm}%,entity_type.ilike.%${logsSearchTerm}%`);
      }

      const from = logsPage * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      setAdminLogs(data || []);
      setLogsTotalCount(count || 0);
    } catch (err) {
      console.error("Fetch Logs Error:", err);
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
      
      await logAdminAction('UPDATE', 'student', `Updated student details: ${editData.full_name} (Super Admin)`, { student_id: editData.id });
      
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

      // Filter out super admins if any (though they shouldn't be in students table normally)
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

      const [p, u, c, de, ce, dm, cl, ss, ap, pc, ps, pcan, visits] = await Promise.all([
        supabase.from("profiles").select("*").in("id", staffUserIds),
        supabase.from("universities").select("*").order("name"),
        supabase.from("colleges").select("*, universities(name)").order("name"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("certificates").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("internship_domains").select("*").order("name"),
        supabase.from("classes").select("*, internship_domains(name)").order("scheduled_at", { ascending: true }),
        supabase.from("system_settings").select("*"),
        supabase.from("admin_permissions").select("*"),
        supabase.from("payment_config").select("*").eq("id", 1).maybeSingle(),
        supabase.from("payment_success").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("payment_cancelled").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("site_visits").select("id, visitor_id")
      ]);
      
      console.log("SuperAdmin - Fetched Payments:", ps.data?.length || 0);
      console.log("SuperAdmin - Fetched Leads:", pcan.data?.length || 0);

      const rolesMap = (adminRoles || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.role);
        return acc;
      }, {});

      // Staff list (Admins & Super Admins)
      const staffList = (p.data || []).map(prof => ({ 
        ...prof, 
        roles: rolesMap[prof.id] || [] 
      }));

      setStaff(staffList);
      setUnis(u.data || []);
      setColleges(c.data || []);
      setDepartments(de.data || []);
      setCerts(ce.data || []);
      setDomains(dm.data || []);
      setClassesList(cl.data || []);
      setSystemSettings(ss.data || []);
      setAdminPermissions(ap.data || []);
      setPaymentConfig(pc.data || { id: 1, razorpay_key_id: '', razorpay_key_secret: '', amount_paise: 9900, is_active: false });
      setPayments(ps.data || []);
      setCancelledPayments(pcan.data || []);
      setVisitorCount(visits.data?.length || 0);
      setUniqueVisitorCount(new Set(visits.data?.map(v => v.visitor_id)).size);

      // Initial students fetch
      await Promise.all([
        fetchStudents(),
        fetchLogs()
      ]);
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
    if (allowed) {
      fetchLogs();
    }
  }, [logsPage, logsSearchTerm]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isSuper = (roles || []).some((r: any) => r.role === "super_admin");
      setAllowed(isSuper);
      if (isSuper) await loadAll();
      else navigate("/admin");
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
        `Issued ${selectedStudents.length} certificates for ${certProgram}`,
        { student_count: selectedStudents.length, program: certProgram, duration: certDuration }
      );

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
    
    await logAdminAction(
      'UPDATE', 
      'student', 
      `${newStatus === "Blocked" ? "Blocked" : "Unblocked"} student ${user.full_name}`,
      { student_id: user.id, status: newStatus }
    );

    toast.success(`User ${newStatus}`);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const user = students.find(s => s.id === id) || staff.find(s => s.id === id);
    await supabase.from("students").delete().eq("id", id);
    
    await logAdminAction(
      'DELETE', 
      'student', 
      `Deleted student/staff ${user?.full_name || id}`,
      { entity_id: id, name: user?.full_name }
    );

    toast.success("Deleted");
    loadAll();
  };


  // CRUD for Domains/Unis
  const addDomain = async () => {
    if (!newDomain.trim()) return;
    await supabase.from("internship_domains").insert({ name: newDomain.trim() });
    
    await logAdminAction('CREATE', 'domain', `Added internship domain: ${newDomain.trim()}`);
    
    setNewDomain(""); loadAll();
  };

  const delDomain = async (id: string) => {
    if (!confirm("Delete domain?")) return;
    const domain = domains.find(d => d.id === id);
    await supabase.from("internship_domains").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'domain', `Deleted internship domain: ${domain?.name || id}`);
    
    loadAll();
  };

  const addUni = async () => {
    if (!newUni.trim()) return;
    const logo = prompt("Enter University Logo URL (optional):") || "";
    await supabase.from("universities").insert({ name: newUni.trim(), logo_url: logo });
    
    await logAdminAction('CREATE', 'university', `Added university: ${newUni.trim()}`);
    
    setNewUni(""); loadAll();
  };

  const delUni = async (id: string) => {
    if (!confirm("Delete university?")) return;
    const uni = unis.find(u => u.id === id);
    await supabase.from("universities").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'university', `Deleted university: ${uni?.name || id}`);
    
    loadAll();
  };

  const addCollege = async () => {
    if (!newCollege.trim() || !collegeUni) return toast.error("Enter name and select university");
    await supabase.from("colleges").insert({ name: newCollege.trim(), university_id: collegeUni });
    
    const uniName = unis.find(u => u.id === collegeUni)?.name;
    await logAdminAction('CREATE', 'college', `Added college: ${newCollege.trim()} to ${uniName}`);
    
    setNewCollege(""); loadAll();
    toast.success("College added");
  };

  const delCollege = async (id: string) => {
    const college = colleges.find(c => c.id === id);
    await supabase.from("colleges").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'college', `Deleted college: ${college?.name || id}`);
    
    toast.success("College removed");
    loadAll();
  };

  const addDept = async () => {
    if (!newDept || !deptCollege) return;
    const { error } = await supabase.from("departments").insert({ name: newDept, college_id: deptCollege });
    if (error) toast.error("Error adding department");
    else {
      const collegeName = colleges.find(c => c.id === deptCollege)?.name;
      await logAdminAction('CREATE', 'department', `Added department: ${newDept} to ${collegeName}`);
      
      setNewDept("");
      toast.success("Department added");
      loadAll();
    }
  };

  const delDept = async (id: string) => {
    const dept = departments.find(d => d.id === id);
    await supabase.from("departments").delete().eq("id", id);
    
    await logAdminAction('DELETE', 'department', `Deleted department: ${dept?.name || id}`);
    
    toast.success("Department removed");
    loadAll();
  };

  const resetPlatformData = async () => {
    if (resetConfirmText !== "RESET") {
      toast.error("Please type RESET to confirm");
      return;
    }
    
    setProcessing(true);
    try {
      const tasks = [];
      if (resetOptions.payments) tasks.push(supabase.from("payment_success").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      if (resetOptions.leads) tasks.push(supabase.from("payment_cancelled").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      if (resetOptions.certs) tasks.push(supabase.from("certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      if (resetOptions.students) tasks.push(supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      if (resetOptions.classes) tasks.push(supabase.from("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      if (resetOptions.institutions) {
        tasks.push(supabase.from("departments").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
        tasks.push(supabase.from("colleges").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
        tasks.push(supabase.from("universities").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      }
      if (resetOptions.domains) tasks.push(supabase.from("internship_domains").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      
      await Promise.all(tasks);
      
      await logAdminAction('SYSTEM_RESET', 'platform', `Platform data reset performed for: ${Object.entries(resetOptions).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`, { resetOptions });
      
      toast.success("Selected data has been reset");
      setIsResetDialogOpen(false);
      setResetConfirmText("");
      loadAll();
    } catch (err) {
      toast.error("Failed to reset data");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkCollegeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!collegeUni) {
      toast.error("Please select a University from the dropdown first!");
      e.target.value = "";
      return;
    }

    const selectedUniName = unis.find(u => u.id === collegeUni)?.name || "selected university";
    toast.info(`Uploading to ${selectedUniName}...`);

    setProcessing(true);
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        try {
          const rows = results.data as string[][];
          if (!rows || rows.length === 0) {
            toast.error("The CSV file appears to be empty.");
            return;
          }

          const collegeNames = rows
            .map(r => r[0])
            .filter(n => n && n.trim() && !n.toLowerCase().includes("college name") && !n.toLowerCase().includes("university"));
          
          if (collegeNames.length === 0) {
            toast.error("No valid college names found. Make sure the first column contains the names.");
            return;
          }

          const inserts = collegeNames.map(name => ({
            name: name.trim(),
            university_id: collegeUni
          }));

          const { error, data } = await supabase.from("colleges").insert(inserts).select();
          
          if (error) {
            console.error("Supabase Insert Error:", error);
            throw error;
          }

          await logAdminAction('BULK_ACTION', 'college', `Bulk uploaded ${collegeNames.length} colleges to ${selectedUniName}`, { university_id: collegeUni, count: collegeNames.length });

          toast.success(`Successfully added ${collegeNames.length} colleges to ${selectedUniName}!`);
          await loadAll();
        } catch (err: any) {
          console.error("Bulk Upload Error:", err);
          toast.error("Upload failed: " + (err.message || "Unknown error"));
        } finally {
          setProcessing(false);
          if (e.target) e.target.value = ""; 
        }
      },
      error: (err) => {
        console.error("PapaParse Error:", err);
        toast.error("Failed to parse CSV: " + err.message);
        setProcessing(false);
      }
    });
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

  // Filtering Logic (Now handled server-side, but keeping for compatibility if needed)
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

      await logAdminAction('CREATE', 'class', `Scheduled class: ${newClassTitle}`, { title: newClassTitle, schedule: newClassSchedule });

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
    
    await logAdminAction('DELETE', 'class', `Deleted scheduled class: ${cl?.title || id}`);
    
    toast.success("Class deleted");
    loadAll();
  };

  const toggleClassActive = async (cl: any) => {
    const newStatus = !cl.is_active;
    await supabase.from("classes").update({ is_active: newStatus }).eq("id", cl.id);
    
    await logAdminAction('UPDATE', 'class', `${newStatus ? "Enabled" : "Disabled"} class: ${cl.title}`, { class_id: cl.id, active: newStatus });
    
    toast.success(newStatus ? "Class enabled — students can now see it" : "Class disabled — hidden from students");
    loadAll();
  };

  const handleAddStaff = async () => {
    if (!staffEmail) return toast.error("Enter an email");
    try {
      const { data: user } = await supabase.from("profiles").select("id").eq("email", staffEmail).maybeSingle();
      if (!user) return toast.error("User not found in platform");
      
      await supabase.from("user_roles").insert({ user_id: user.id, role: 'admin' });
      
      await logAdminAction('CREATE', 'staff', `Granted admin access to ${staffEmail}`, { user_id: user.id, email: staffEmail });
      
      toast.success("Staff access granted!");
      setStaffEmail("");
      setIsAddStaffOpen(false);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const removeStaff = async (id: string) => {
    if (!confirm("Remove this person from staff?")) return;
    const s = staff.find(x => x.id === id);
    await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    
    await logAdminAction('DELETE', 'staff', `Revoked admin access for ${s?.full_name || id}`, { user_id: id, name: s?.full_name });
    
    toast.success("Staff access revoked");
    loadAll();
  };

  const toggleAdminPermission = async (userId: string, permKey: string, currentVal: boolean) => {
    try {
      const newVal = !currentVal;
      const { data: existing } = await supabase.from("admin_permissions").select("id").eq("user_id", userId).maybeSingle();
      
      if (existing) {
        await supabase.from("admin_permissions").update({ [permKey]: newVal }).eq("user_id", userId);
      } else {
        await supabase.from("admin_permissions").insert({ user_id: userId, [permKey]: newVal });
      }

      const s = staff.find(x => x.id === userId);
      await logAdminAction('UPDATE', 'permissions', `Updated ${permKey} for ${s?.full_name || userId} to ${newVal}`, { user_id: userId, permission: permKey, value: newVal });

      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const updatePaymentConfig = async (updates: any) => {
    try {
      const newConfig = { ...paymentConfig, ...updates };
      setPaymentConfig(newConfig);
      const { error } = await supabase.from("payment_config").upsert({
        id: 1,
        razorpay_key_id: newConfig.razorpay_key_id,
        razorpay_key_secret: newConfig.razorpay_key_secret,
        amount_paise: newConfig.amount_paise,
        is_active: newConfig.is_active,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;

      await logAdminAction('UPDATE', 'setting', `Updated payment gateway configuration`, { config: updates });

      toast.success("Payment settings updated!");
      loadAll();
    } catch (err: any) { 
      toast.error(err.message); 
    }
  };

  const savePaymentConfig = async () => {
    await updatePaymentConfig({});
  };

  const toggleSystemSetting = async (key: string, current: boolean) => {
    const { error } = await supabase.from("system_settings").update({ is_enabled: !current }).eq("key", key);
    if (error) {
      toast.error("Update failed");
    } else {
      await logAdminAction('UPDATE', 'setting', `${!current ? "Enabled" : "Disabled"} system setting: ${key}`, { setting: key, enabled: !current });
      toast.success(`${key.replace('_', ' ')} toggled`);
      loadAll();
    }
  };

  const handleTransferLead = async (lead: any) => {
    if (!confirm(`Are you sure you want to transfer ${lead.metadata?.fullName || lead.user_email} to registered students? This will create a student account.`)) return;
    
    let password = lead.metadata?.password;
    if (!password) {
      password = prompt(`No password found for this lead. Please enter a password to create their account:`);
      if (!password) return; // User cancelled
      if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    }

    const metadata = lead.metadata || {};
    setProcessing(true);
    try {
      // 1. Create a secondary client to sign up the student without logging out the admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const transferClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
      });

      // 2. Sign up the user
      let userId: string | undefined;
      const { data: authData, error: authError } = await transferClient.auth.signUp({
        email: lead.user_email,
        password: password,
        options: {
          data: { full_name: lead.metadata?.fullName }
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("already exists")) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", lead.user_email)
            .maybeSingle();
          
          if (existingProfile) {
            userId = existingProfile.id;
          } else {
            // Final fallback: Try RPC to get ID from auth.users directly
            const { data: rpcUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', { email_text: lead.user_email });
            if (!rpcError && rpcUserId) {
              userId = rpcUserId;
            } else {
              throw new Error("User is registered in Auth but has no profile and search failed. Please run the SQL fix.");
            }
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id;
      }

      if (!userId) throw new Error("Failed to create or find auth user");

      // 3. Determine next Registration ID
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

      // 4. Create Student Record
      const { error: studentError } = await supabase.from("students").insert({
        id: userId,
        email: lead.user_email,
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

      // 5. Update Profile & Role
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: metadata.fullName,
        email: lead.user_email,
        contact_number: lead.user_phone,
        gender: metadata.gender,
        parent_name: metadata.parentName
      });
      
      await supabase.from("user_roles").insert({ user_id: userId, role: "student" });
      
      // Create Payment Entry (Transaction)
      const { error: paymentError } = await supabase.from("payment_success").insert({
        user_id: userId,
        payment_id: `ADMIN_TRANS_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amount_paise: lead.amount || 9900,
        email: lead.user_email,
        full_name: metadata.fullName,
      });
      if (paymentError) console.error("Payment log error:", paymentError);

      // 6. Delete Lead
      await supabase.from("payment_cancelled").delete().eq("id", lead.id);
      setCancelledPayments(prev => prev.filter(p => p.id !== lead.id));

      toast.success("Lead successfully transferred to registered students!");
      
      await logAdminAction(
        'TRANSFER', 
        'lead', 
        `Transferred lead ${lead.user_email} to registered students`,
        { lead_id: lead.id, student_id: userId }
      );
      
      loadAll();
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.error(err.message || "Failed to transfer lead.");
    } finally {
      setProcessing(false);
    }
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!allowed) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Super Admin Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg overflow-hidden bg-white border border-slate-100">
              <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:block">Super Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 gap-2" onClick={async () => {
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
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="hero" className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Super Admin</Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tighter">Super Dashboard</h1>
              <p className="text-muted-foreground">Master Control & Global Infrastructure Management</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" onClick={exportToCSV}><Download className="size-4" /> Export CSV</Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/register")}><UserPlus className="size-4" /> Add Student</Button>
              <Button variant="hero" className="gap-2 shadow-glow" onClick={() => setIsAddStaffOpen(true)}><Shield className="size-4" /> Add Admin</Button>
            </div>
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <Card className="p-5 border-none shadow-elegant bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Users className="size-5" /></div>
                <Badge variant="outline" className="text-[10px]">+12%</Badge>
              </div>
              <div className="text-2xl font-black">{students.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Interns</div>
            </Card>
            <Card className="p-5 border-none shadow-elegant bg-gradient-to-br from-green-500/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="size-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-600"><Activity className="size-5" /></div>
                <Badge variant="outline" className="text-[10px] text-green-600">Live</Badge>
              </div>
              <div className="text-2xl font-black">{classesList.filter(c => c.is_active !== false).length}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Classes</div>
            </Card>
            <Card className="p-5 border-none shadow-elegant bg-gradient-to-br from-orange-500/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-600"><Award className="size-5" /></div>
                <Badge variant="outline" className="text-[10px]">Verified</Badge>
              </div>
              <div className="text-2xl font-black">{certs.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Certs Issued</div>
            </Card>
            <Card className="p-5 border-none shadow-elegant bg-gradient-to-br from-purple-500/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="size-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600"><Shield className="size-5" /></div>
                <Badge variant="outline" className="text-[10px]">{staff.length} Active</Badge>
              </div>
              <div className="text-2xl font-black">{staff.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Staff Members</div>
            </Card>
          </div>

          <Tabs defaultValue="students" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="bg-muted/50 p-1 flex-wrap h-auto self-start">
                <TabsTrigger value="students" className="gap-2"><Users className="size-4" /> Students</TabsTrigger>
                <TabsTrigger value="bulk" className="gap-2"><Award className="size-4" /> Certification</TabsTrigger>
                <TabsTrigger value="classes" className="gap-2"><BookOpen className="size-4" /> Live Classes</TabsTrigger>
                <TabsTrigger value="institutions" className="gap-2"><Building2 className="size-4" /> Institutions</TabsTrigger>
                <TabsTrigger value="payments" className="gap-2"><DollarSign className="size-4" /> Transactions</TabsTrigger>
                <TabsTrigger value="leads" className="gap-2"><UserPlus className="size-4" /> Leads</TabsTrigger>
                <TabsTrigger value="staff" className="gap-2"><Shield className="size-4" /> Staff</TabsTrigger>
                <TabsTrigger value="logs" className="gap-2"><Clock className="size-4" /> Activity Logs</TabsTrigger>
                <TabsTrigger value="settings" className="gap-2"><Building2 className="size-4" /> Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="students" className="space-y-6">
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
                  <TableHeader className="bg-muted/30"><TableRow>
                    <TableHead className="w-10"><Checkbox checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {isStudentsLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : (
                      <>
                        {filteredStudents.map(s => (
                          <TableRow key={s.id} className="group hover:bg-muted/20 transition-colors">
                            <TableCell><Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shadow-inner">{s.full_name?.charAt(0)}</div>
                                <div><div className="font-bold text-sm tracking-tight">{s.full_name}</div><div className="text-[10px] text-muted-foreground">{s.email}</div></div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-bold px-2 py-0.5">{s.internship_domain || "Unassigned"}</Badge></TableCell>
                            <TableCell><div className="text-xs font-medium text-slate-600">{s.college_name || "—"}</div></TableCell>
                            <TableCell className="text-xs text-muted-foreground font-medium">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="size-8 p-0"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 shadow-elegant p-1">
                                  <DropdownMenuItem onClick={() => { setSelectedUser(s); setIsViewDialogOpen(true); }} className="gap-2 py-2 px-3"><Eye className="size-4" /> View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditData({...s}); setIsEditDialogOpen(true); }} className="gap-2 py-2 px-3 text-primary"><Edit className="size-4" /> Edit Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleBlock(s)} className={`gap-2 py-2 px-3 ${s.status === "Blocked" ? "text-green-600" : "text-destructive"}`}>
                                    {s.status === "Blocked" ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />} {s.status === "Blocked" ? "Unblock" : "Block"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(s.id)} className="gap-2 py-2 px-3 text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
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

            <TabsContent value="bulk" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-primary/5 to-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 pointer-events-none"><Award className="size-40" /></div>
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Award className="size-6 text-primary" /> Certificate Engine</h3>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Internship Program</Label>
                        <Select value={certProgram} onValueChange={setCertProgram}>
                          <SelectTrigger className="bg-white/50 backdrop-blur-sm h-11"><SelectValue placeholder="Select Domain" /></SelectTrigger>
                          <SelectContent>
                            {domains.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Program Duration</Label>
                        <Input value={certDuration} onChange={e => setCertDuration(e.target.value)} placeholder="e.g. 3 Months" className="bg-white/50 backdrop-blur-sm h-11" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-white/80 rounded-2xl border border-primary/20 shadow-soft">
                      <div><p className="text-lg font-black tracking-tight">{selectedStudents.length} Students Selected</p><p className="text-xs text-muted-foreground font-medium">Digital certificates will be issued and verified instantly.</p></div>
                      <Button variant="hero" size="lg" className="gap-2 px-8 shadow-glow" disabled={processing || selectedStudents.length === 0} onClick={handleBulkCertificate}>
                        {processing ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />} Issue Now
                      </Button>
                    </div>
                  </Card>

                  <Card className="overflow-hidden border-none shadow-elegant">
                    <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                      <h3 className="font-bold text-sm">Selection List</h3>
                      <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" /><Input className="pl-8 h-8 text-xs bg-white/50" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    </div>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={toggleSelectAll} /></TableHead><TableHead>Student</TableHead><TableHead>Domain</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredStudents.map(s => (
                            <TableRow key={s.id} className={`transition-colors ${selectedStudents.includes(s.id) ? "bg-primary/5" : ""}`}>
                              <TableCell><Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>
                              <TableCell className="font-bold text-xs tracking-tight">{s.full_name}</TableCell>
                              <TableCell className="text-[10px] font-black text-muted-foreground uppercase">{s.internship_domain}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6 border-none shadow-elegant">
                    <h4 className="font-black text-sm uppercase tracking-widest text-muted-foreground mb-4">Registry Feed</h4>
                    <ScrollArea className="h-[550px] pr-2">
                      <div className="space-y-3">
                        {certs.slice(0, 15).map(c => (
                          <div key={c.id} className="p-4 border border-border/50 bg-muted/10 rounded-2xl hover:bg-muted/30 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-sm group-hover:text-primary transition-colors">{c.student_name}</div>
                              <Badge variant="outline" className="text-[8px] px-1 h-4">{c.status}</Badge>
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground flex justify-between items-center">
                              <span className="flex items-center gap-1"><Shield className="size-3" /> {c.certificate_id}</span>
                              <span>{new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 border-none shadow-elegant bg-gradient-to-br from-slate-50 to-white">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2"><BookOpen className="size-6 text-primary" /> Class Orchestrator</h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Target Audience</Label>
                        <Select value={newClassDomain} onValueChange={setNewClassDomain}>
                          <SelectTrigger className="h-11 bg-white shadow-soft"><SelectValue placeholder="Target Audience" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Universal (All Domains)</SelectItem>
                            {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Platform Delivery</Label>
                        <Select value={newClassType} onValueChange={setNewClassType}>
                          <SelectTrigger className="h-11 bg-white shadow-soft"><SelectValue placeholder="Platform" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube Embed (Livestream)</SelectItem>
                            <SelectItem value="meet">Interactive Meet (Google/Zoom)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Session Topic</Label>
                        <Input value={newClassTitle} onChange={e => setNewClassTitle(e.target.value)} placeholder="e.g. Masterclass on Node.js" className="h-11 bg-white shadow-soft" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Access Link URL</Label>
                        <Input value={newClassUrl} onChange={e => setNewClassUrl(e.target.value)} placeholder="https://..." className="h-11 bg-white shadow-soft" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Schedule Timeline</Label>
                        <Input type="datetime-local" value={newClassSchedule} onChange={e => setNewClassSchedule(e.target.value)} className="h-11 bg-white shadow-soft" />
                      </div>

                      <Button className="w-full h-11 gap-2 mt-4 shadow-elegant font-bold" onClick={addClass}><Calendar className="size-4" /> Deploy Session</Button>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card className="overflow-hidden border-none shadow-elegant h-full bg-card/50 backdrop-blur-sm">
                    <div className="p-5 bg-muted/20 border-b flex justify-between items-center">
                      <h3 className="font-black text-sm uppercase tracking-wider">Scheduled Deployment Feed</h3>
                      <Badge variant="hero" className="rounded-md font-bold">{classesList.length} Sessions</Badge>
                    </div>
                    <ScrollArea className="h-[550px]">
                      {classesList.length === 0 ? (
                        <div className="p-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                          <Activity className="size-12 opacity-10" />
                          <p className="font-medium">No sessions scheduled on the grid.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader><TableRow><TableHead className="uppercase text-[10px] font-black">Timeline</TableHead><TableHead className="uppercase text-[10px] font-black">Topic</TableHead><TableHead className="uppercase text-[10px] font-black">Segment</TableHead><TableHead className="uppercase text-[10px] font-black">Status</TableHead><TableHead className="text-right uppercase text-[10px] font-black">Actions</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {classesList.map(cl => (
                              <TableRow key={cl.id} className={`group hover:bg-muted/30 transition-colors ${!cl.is_active ? "opacity-50 grayscale" : ""}`}>
                                <TableCell className="whitespace-nowrap font-bold text-xs text-slate-700">
                                  {new Date(cl.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </TableCell>
                                <TableCell className="font-black tracking-tight">{cl.title}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter">{cl.internship_domains?.name || "Global"}</Badge></TableCell>
                                <TableCell>
                                  {cl.is_active !== false ? (
                                    <Badge className="bg-green-500 text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5">Live</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 text-muted-foreground">Paused</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleClassActive(cl)}
                                      className={`size-8 p-0 rounded-lg transition-colors ${cl.is_active !== false ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-slate-100"}`}
                                    >
                                      {cl.is_active !== false ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="size-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => delClass(cl.id)}><Trash2 className="size-4" /></Button>
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

            <TabsContent value="settings" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-indigo-50/50 to-white">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Briefcase className="size-5 text-indigo-600" /> Professional Domains</h3>
                  <div className="flex gap-3 mb-6">
                    <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Domain Name (e.g. AI & ML)..." className="h-11 bg-white shadow-soft" />
                    <Button variant="hero" className="h-11 w-11 p-0 shadow-glow" onClick={addDomain}><Plus className="size-5" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {domains.map(d => (
                      <Badge key={d.id} variant="secondary" className="pl-4 pr-1.5 py-1.5 gap-3 rounded-xl border border-border/50 bg-white shadow-soft font-bold text-slate-700">
                        {d.name} 
                        <Button size="sm" variant="ghost" className="size-5 p-0 h-auto text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => delDomain(d.id)}><Trash2 className="size-3" /></Button>
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-red-50/50 to-white">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Shield className="size-5 text-red-600" /> Service Access Control</h3>
                  <p className="text-xs text-muted-foreground mb-6 font-medium">Disable services platform-wide. This affects both Admins and Students.</p>
                  
                  <div className="space-y-4">
                    {systemSettings.map(s => (
                      <div key={s.key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-soft">
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-lg flex items-center justify-center ${s.is_enabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {s.key === 'live_classes' && <BookOpen className="size-4" />}
                            {s.key === 'certificates' && <Award className="size-4" />}
                            {s.key === 'bulk_certification' && <Shield className="size-4" />}
                            {s.key === 'internship_registration' && <UserPlus className="size-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold capitalize">{s.key.replace('_', ' ')}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{s.is_enabled ? 'Service is Active' : 'Service is Disabled'}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleSystemSetting(s.key, s.is_enabled)}
                          className={s.is_enabled ? "text-green-600" : "text-red-600"}
                        >
                          {s.is_enabled ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
                        </Button>
                      </div>
                    ))}
                    {systemSettings.length === 0 && (
                      <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-muted-foreground text-xs font-bold">
                        No settings found in database.
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-orange-50/50 to-white md:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black flex items-center gap-2"><DollarSign className="size-5 text-orange-600" /> Razorpay Integration</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{paymentConfig?.is_active ? 'Active' : 'Disabled'}</span>
                      <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => updatePaymentConfig({ is_active: !paymentConfig?.is_active })}>
                        {paymentConfig?.is_active ? <ToggleRight className="size-8 text-green-600" /> : <ToggleLeft className="size-8 text-slate-400" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground">Razorpay Key ID</Label>
                      <Input 
                        value={paymentConfig?.razorpay_key_id || ''} 
                        onChange={e => setPaymentConfig({...paymentConfig, razorpay_key_id: e.target.value})}
                        placeholder="rzp_live_..." 
                        className="bg-white shadow-soft h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground">Razorpay Key Secret</Label>
                      <Input 
                        type="password"
                        value={paymentConfig?.razorpay_key_secret || ''} 
                        onChange={e => setPaymentConfig({...paymentConfig, razorpay_key_secret: e.target.value})}
                        placeholder="••••••••••••" 
                        className="bg-white shadow-soft h-11"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Amount (INR)</Label>
                        <Input 
                          type="number"
                          value={(paymentConfig?.amount_paise || 0) / 100} 
                          onChange={e => setPaymentConfig({...paymentConfig, amount_paise: parseFloat(e.target.value) * 100})}
                          className="bg-white shadow-soft h-11"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button variant="hero" className="w-full h-11 shadow-glow font-bold" onClick={() => savePaymentConfig()}>
                          Save Gateway Settings
                        </Button>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic mt-2">Note: Key Secret is stored securely and never exposed to students.</p>
                  </div>
                </Card>

                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-blue-50/50 to-white md:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black flex items-center gap-2"><Mail className="size-5 text-blue-600" /> Test Mail Delivery</h3>
                      <p className="text-xs text-muted-foreground font-medium">Verify your SMTP configuration by sending a manual test email.</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Recipient Email</Label>
                        <Input 
                          value={testMailTo} 
                          onChange={e => setTestMailTo(e.target.value)}
                          placeholder="test@example.com" 
                          className="bg-white shadow-soft h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Subject</Label>
                        <Input 
                          value={testMailSubject} 
                          onChange={e => setTestMailSubject(e.target.value)}
                          placeholder="Test Email Subject" 
                          className="bg-white shadow-soft h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground">Message Body</Label>
                      <textarea 
                        value={testMailBody} 
                        onChange={e => setTestMailBody(e.target.value)}
                        placeholder="Type your test message here..." 
                        className="w-full h-[120px] p-4 rounded-xl border bg-white shadow-soft focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 gap-2 mt-6 shadow-glow font-bold" 
                    disabled={isSendingTestMail || !testMailTo}
                    onClick={async () => {
                      setIsSendingTestMail(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("admin-tasks", {
                          body: {
                            action: "send_test_email",
                            to: testMailTo,
                            subject: testMailSubject,
                            message: testMailBody
                          }
                        });
                        
                        if (error) throw error;
                        
                        if (data?.success) {
                          toast.success("Test email sent successfully via Admin-Tasks! Check your inbox.");
                        } else {
                          toast.error(data?.error || "Failed to send test email.");
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Network error while sending test email.");
                        console.error(err);
                      } finally {
                        setIsSendingTestMail(false);
                      }
                    }}
                  >
                    {isSendingTestMail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                    {isSendingTestMail ? 'Sending Test Mail...' : 'Send Test Diagnostic Email'}
                  </Button>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="institutions" className="space-y-6">
              <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-blue-50/50 to-white">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-2"><Building2 className="size-7 text-blue-600" /> Institution Network</h3>
                    <p className="text-sm text-muted-foreground font-medium">Manage Universities and their affiliated Colleges</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="hero" className="px-3 py-1">{unis.length} Universities</Badge>
                    <Badge variant="secondary" className="px-3 py-1">{colleges.length} Colleges</Badge>
                  </div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4 p-6 bg-white/50 rounded-3xl shadow-soft border border-white/50">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Plus className="size-5" />
                        <span className="text-xs font-black uppercase tracking-wider">New University</span>
                      </div>
                      <div className="flex gap-3">
                        <Input value={newUni} onChange={e => setNewUni(e.target.value)} placeholder="University Full Title..." className="h-12 bg-white shadow-soft rounded-xl border-none" />
                        <Button variant="hero" className="h-12 px-6 shadow-glow font-bold rounded-xl" onClick={addUni}>Add Uni</Button>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-white/50 rounded-3xl shadow-soft border border-white/50">
                      <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Plus className="size-5" />
                        <span className="text-xs font-black uppercase tracking-wider">New Affiliated College</span>
                      </div>
                      <div className="space-y-3">
                        <Select value={collegeUni} onValueChange={setCollegeUni}>
                          <SelectTrigger className="h-12 bg-white shadow-soft rounded-xl border-none"><SelectValue placeholder="Select Parent University" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-elegant">{unis.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="flex gap-3">
                          <Input value={newCollege} onChange={e => setNewCollege(e.target.value)} placeholder="College Name..." className="h-12 bg-white shadow-soft rounded-xl border-none" />
                          <Button variant="hero" className="h-12 px-6 shadow-glow font-bold rounded-xl" onClick={addCollege}>Add College</Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-white/50 rounded-3xl shadow-soft border border-white/50">
                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <Plus className="size-5" />
                        <span className="text-xs font-black uppercase tracking-wider">New Department</span>
                      </div>
                      <div className="space-y-3">
                        <Select value={deptCollege} onValueChange={setDeptCollege}>
                          <SelectTrigger className="h-12 bg-white shadow-soft rounded-xl border-none"><SelectValue placeholder="Select Parent College" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-elegant">
                            {unis.map(u => (
                              <div key={u.id}>
                                <div className="px-2 py-1.5 text-xs font-black bg-slate-50 text-slate-400 uppercase tracking-widest">{u.name}</div>
                                {colleges.filter(c => c.university_id === u.id).map(c => (
                                  <SelectItem key={c.id} value={c.id} className="pl-6">{c.name}</SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-3">
                          <Input value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Department Name..." className="h-12 bg-white shadow-soft rounded-xl border-none" />
                          <Button variant="hero" className="h-12 px-6 shadow-glow font-bold rounded-xl" onClick={addDept}>Add Dept</Button>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="bg-white/40 rounded-3xl p-2 border border-white/50 shadow-inner">
                    <ScrollArea className="h-[600px] px-4">
                      <div className="space-y-6 py-4">
                        {unis.map(u => (
                          <div key={u.id} className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blue-100 shadow-soft group hover:border-primary/40 transition-all">
                              <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner overflow-hidden border border-slate-100">
                                  {u.logo_url ? (
                                    <img src={u.logo_url} className="size-full object-contain p-2" alt="" />
                                  ) : (
                                    <Building2 className="size-5 text-slate-300" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-base font-black tracking-tight text-slate-800 block">{u.name}</span>
                                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{colleges.filter(c => c.university_id === u.id).length} Colleges Affiliated</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Label htmlFor={`logo-${u.id}`} className="cursor-pointer">
                                  <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-100 transition-colors shadow-soft">
                                    <Plus className="size-3" /> LOGO
                                  </div>
                                  <Input id={`logo-${u.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file, u.id); }} />
                                </Label>
                                <Button variant="ghost" size="sm" className="size-9 p-0 hover:bg-slate-100 rounded-xl" onClick={() => editUni(u)}><Edit className="size-4" /></Button>
                                <Button variant="ghost" size="sm" className="size-9 p-0 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => delUni(u.id)}><Trash2 className="size-4" /></Button>
                              </div>
                            </div>
                            
                            <div className="pl-10 space-y-2">
                                  {colleges.filter(col => col.university_id === u.id).map(col => (
                                    <div key={col.id} className="space-y-1">
                                      <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-2xl border border-slate-100 group shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <div className="size-1.5 rounded-full bg-indigo-400" />
                                          <span className="text-xs font-bold text-slate-700">{col.name}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="size-8 p-0 text-destructive hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => delCollege(col.id)}><Trash2 className="size-3.5" /></Button>
                                      </div>
                                      <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-3 py-1">
                                        {departments.filter(d => d.college_id === col.id).map(d => (
                                          <div key={d.id} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl group/dept border border-dashed border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                                            <span className="text-[10px] font-medium text-slate-500">{d.name}</span>
                                            <Button variant="ghost" size="sm" className="size-6 p-0 text-destructive opacity-0 group-hover/dept:opacity-100 transition-opacity" onClick={() => delDept(d.id)}><Trash2 className="size-3" /></Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                              {colleges.filter(col => col.university_id === u.id).length === 0 && (
                                <div className="p-3 text-[10px] text-muted-foreground font-bold italic tracking-wider">No colleges added yet.</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            </TabsContent>


            <TabsContent value="staff" className="space-y-6">
              <Card className="overflow-hidden border-none shadow-elegant bg-card/50 backdrop-blur-sm">
                <div className="p-5 bg-muted/20 border-b flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-widest">Privileged Access List</h3>
                  <Button variant="hero" size="sm" className="gap-2 font-bold px-4" onClick={() => setIsAddStaffOpen(true)}><Shield className="size-4" /> Grant Access</Button>
                </div>
                <Table>
                  <TableHeader className="bg-muted/10"><TableRow><TableHead className="uppercase text-[10px] font-black">Staff Member</TableHead><TableHead className="uppercase text-[10px] font-black">Access Levels</TableHead><TableHead className="text-right uppercase text-[10px] font-black">Revocation</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {staff.map(s => (
                      <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-xs">{s.full_name?.charAt(0)}</div>
                            <div><div className="font-bold text-sm">{s.full_name}</div><div className="text-[10px] text-muted-foreground font-medium">{s.email}</div></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {s.roles.map((r: string) => (
                              <Badge key={r} variant={r === 'super_admin' ? 'hero' : 'outline'} className="text-[8px] font-black uppercase tracking-wider px-2 h-5">
                                {r.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold hover:bg-slate-100" onClick={() => { setSelectedAdminForPerms(s); setIsPermsDialogOpen(true); }}>
                              <Shield className="size-3.5" /> Permissions
                            </Button>
                            {s.roles.includes('super_admin') ? (
                              <span className="text-[9px] font-bold text-muted-foreground italic px-3">PROTECTED</span>
                            ) : (
                              <Button variant="ghost" size="sm" className="size-8 p-0 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <div className="space-y-6">
                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-green-50/50 to-white">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><DollarSign className="size-6 text-green-600" /> Revenue Tracking</h3>
                        <p className="text-xs text-muted-foreground font-medium">Monitoring all platform transactions</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={loadAll} className="size-10 p-0 rounded-xl hover:bg-green-50 text-green-600"><Loader2 className={`size-5 ${loading ? 'animate-spin' : ''}`} /></Button>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-green-600">₹{payments.reduce((acc, curr) => acc + (curr.amount_paise || 0), 0) / 100}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Collection</div>
                    </div>
                  </div>

                  <ScrollArea className="h-[500px] rounded-2xl border border-slate-100 bg-white/50 backdrop-blur-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50"><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Payment ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Profile</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {payments.map(pay => (
                          <TableRow key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="text-[10px] font-bold text-slate-500">{new Date(pay.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="font-black text-slate-800 text-sm">{pay.full_name || pay.email}</div>
                              <div className="text-[10px] text-muted-foreground font-medium">{pay.email}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] font-mono bg-white">{pay.payment_id}</Badge></TableCell>
                            <TableCell className="font-black text-slate-800">₹{(pay.amount_paise || 0) / 100}</TableCell>
                            <TableCell><Badge className="bg-green-500 shadow-sm border-none text-[10px] uppercase font-black px-3 py-1">Captured</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="size-8 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors" 
                                onClick={() => {
                                  const student = students.find(s => s.email === pay.email);
                                  if (student) {
                                    setSelectedUser(student);
                                    setIsViewDialogOpen(true);
                                  } else {
                                    toast.error("Detailed profile not found");
                                  }
                                }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-bold italic">No payment records found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads">
              <div className="space-y-6">
                <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-indigo-50/50 to-white">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><UserPlus className="size-6 text-indigo-600" /> Lead Generation</h3>
                      <p className="text-xs text-muted-foreground font-medium">Tracking students who initiated registration but failed payment</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search leads..." 
                          className="pl-9 h-10 bg-white shadow-soft" 
                          value={leadsSearchTerm}
                          onChange={e => setLeadsSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-2xl font-black text-indigo-600 leading-none">{cancelledPayments.length}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leads</div>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-[500px] rounded-2xl border border-slate-100 bg-white/50 backdrop-blur-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50"><TableRow><TableHead>Date</TableHead><TableHead>Lead Details</TableHead><TableHead>Potential Amount</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Follow-up</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {cancelledPayments
                          .filter(cp => {
                            // Preemptive hide: If student with this email already exists, hide from leads
                            if (students.some(s => s.email === cp.user_email)) return false;

                            if (!leadsSearchTerm) return true;
                            const search = leadsSearchTerm.toLowerCase();
                            return (
                              cp.user_email?.toLowerCase().includes(search) || 
                              cp.metadata?.fullName?.toLowerCase().includes(search) ||
                              cp.user_phone?.includes(search)
                            );
                          })
                          .map(cp => (
                          <TableRow key={cp.id} className="hover:bg-indigo-50/20 transition-colors">
                            <TableCell className="text-[10px] font-bold text-slate-500">{new Date(cp.created_at).toLocaleString()}</TableCell>
                             <TableCell>
                               <div className="font-black text-slate-800 text-sm">{cp.metadata?.fullName || cp.user_email}</div>
                               <div className="text-[10px] text-muted-foreground font-medium">{cp.user_email} • {cp.user_phone || cp.metadata?.contact || 'No phone'}</div>
                               <div className="flex flex-wrap gap-1 mt-1">
                                 <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-500 border-indigo-100 leading-none py-0.5">{cp.metadata?.college || 'No College'}</Badge>
                                 <Badge variant="outline" className="text-[8px] font-black uppercase text-emerald-500 border-emerald-100 leading-none py-0.5">{cp.metadata?.course || 'No Domain'}</Badge>
                                 {cp.metadata?.semester && <Badge variant="outline" className="text-[8px] font-black uppercase text-amber-500 border-amber-100 leading-none py-0.5">{cp.metadata.semester}</Badge>}
                               </div>
                             </TableCell>
                            <TableCell className="font-black text-slate-800">₹{(cp.amount || 0) / 100}</TableCell>
                            <TableCell><Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] font-bold">{cp.reason}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="size-9 p-0 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
                                  onClick={() => {
                                    setSelectedUser(cp);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="size-4" />
                                </Button>
                                <Button asChild variant="ghost" size="sm" className="size-9 p-0 rounded-full hover:bg-indigo-600 hover:text-white transition-all">
                                  <a href={`mailto:${cp.user_email}`}><Mail className="size-4" /></a>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="size-9 p-0 rounded-full hover:bg-emerald-600 hover:text-white transition-all"
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
                        {cancelledPayments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground font-bold italic">Zero leads recorded.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <Card className="p-8 border-none shadow-elegant bg-white/50 backdrop-blur-sm rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Shield className="size-6 text-indigo-600" /> Administrative Council</h3>
                    <p className="text-xs text-muted-foreground font-medium">Manage permissions and access for platform administrators</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staff.map(member => (
                    <Card key={member.id} className="p-6 border-none shadow-soft bg-white group hover:shadow-elegant transition-all border-l-4 border-l-indigo-500">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black">
                          {member.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 leading-none mb-1">{member.full_name}</div>
                          <div className="text-[10px] text-muted-foreground font-medium">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-6">
                        {member.roles.map((role: string) => (
                          <Badge key={role} variant="secondary" className="text-[8px] font-black uppercase tracking-widest">{role}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => {
                          setSelectedAdminForPerms(member);
                          setIsPermsDialogOpen(true);
                        }}>Permissions</Button>
                        <Button variant="ghost" size="sm" className="size-9 p-0 rounded-xl text-red-500 hover:bg-red-50" onClick={() => removeStaff(member.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card className="p-8 border-none shadow-elegant bg-gradient-to-br from-emerald-50/50 to-white">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><DollarSign className="size-6 text-emerald-600" /> Payment Gateway</h3>
                        <p className="text-xs text-muted-foreground font-medium">Razorpay API configuration</p>
                      </div>
                      <Badge className={paymentConfig?.is_active ? "bg-emerald-500" : "bg-slate-400"}>{paymentConfig?.is_active ? "Live" : "Inactive"}</Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black text-slate-500 uppercase">Key ID</Label><Input value={paymentConfig?.razorpay_key_id || ''} onChange={e => setPaymentConfig({...paymentConfig, razorpay_key_id: e.target.value})} className="h-12 bg-white/80 border-none shadow-soft rounded-xl font-mono text-xs" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black text-slate-500 uppercase">Key Secret</Label><Input type="password" value={paymentConfig?.razorpay_key_secret || ''} onChange={e => setPaymentConfig({...paymentConfig, razorpay_key_secret: e.target.value})} className="h-12 bg-white/80 border-none shadow-soft rounded-xl font-mono text-xs" /></div>
                      <Button className="w-full h-12 bg-slate-900 text-white font-black shadow-glow rounded-xl" onClick={savePaymentConfig}>Save Config</Button>
                    </div>
                  </Card>

                  <Card className="p-8 border-none shadow-elegant bg-red-50/50 rounded-3xl border border-red-100">
                    <h3 className="text-xl font-black uppercase text-red-600 mb-4">Danger Zone</h3>
                    <Button variant="destructive" className="w-full h-12 font-black shadow-glow rounded-xl" onClick={() => setIsResetDialogOpen(true)}>Platform Factory Reset</Button>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-8 border-none shadow-elegant bg-white/50 backdrop-blur-sm rounded-3xl">
                    <h3 className="text-2xl font-black text-slate-800 mb-6">Internship Domains</h3>
                    <div className="flex gap-3 mb-6"><Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="New Domain..." className="h-12 bg-white shadow-soft rounded-xl border-none" /><Button variant="hero" className="h-12 px-6 shadow-glow font-bold rounded-xl" onClick={addDomain}>Add</Button></div>
                    <div className="flex flex-wrap gap-2">{domains.map(d => <Badge key={d.id} variant="secondary" className="pl-4 pr-1 py-2 gap-2 text-xs font-bold rounded-full bg-white border border-slate-100 shadow-sm group">{d.name} <Button size="sm" variant="ghost" className="size-4 p-0 opacity-0 group-hover:opacity-100" onClick={() => delDomain(d.id)}><Trash2 className="size-3" /></Button></Badge>)}</div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              <Card className="p-6 border-none shadow-elegant bg-card/50 backdrop-blur-sm">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      className="pl-9" 
                      placeholder="Search logs (admin, action, description)..." 
                      value={logsSearchTerm} 
                      onChange={e => setLogsSearchTerm(e.target.value)} 
                    />
                  </div>
                  <Button variant="outline" className="gap-2 w-fit" onClick={() => setLogsSearchTerm("")}>
                    <Filter className="size-4" /> Clear Search
                  </Button>
                </div>
              </Card>

              <Card className="overflow-hidden border-none shadow-elegant">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="uppercase text-[10px] font-black">Timestamp</TableHead>
                      <TableHead className="uppercase text-[10px] font-black">Admin</TableHead>
                      <TableHead className="uppercase text-[10px] font-black">Action</TableHead>
                      <TableHead className="uppercase text-[10px] font-black">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : (
                      <>
                        {adminLogs.map(log => (
                          <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-xs">{log.admin_email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`text-[8px] font-black uppercase px-2 ${
                                  log.action_type === 'DELETE' || log.action_type === 'SYSTEM_RESET' ? 'text-red-600 border-red-100 bg-red-50' : 
                                  log.action_type === 'CREATE' ? 'text-green-600 border-green-100 bg-green-50' :
                                  'text-blue-600 border-blue-100 bg-blue-50'
                                }`}
                              >
                                {log.action_type}
                              </Badge>
                              <div className="text-[8px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tighter">{log.entity_type}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-slate-700">{log.description}</div>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="text-[9px] text-muted-foreground mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-mono overflow-hidden text-ellipsis">
                                  {JSON.stringify(log.metadata)}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {adminLogs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-medium italic">
                              No activity logs found.
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>

                {/* Logs Pagination */}
                <div className="p-4 bg-muted/10 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground font-medium">
                    Showing {logsTotalCount === 0 ? 0 : logsPage * pageSize + 1} to {Math.min(logsTotalCount, (logsPage + 1) * pageSize)} of {logsTotalCount} logs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={logsPage === 0 || logsLoading}
                      onClick={() => setLogsPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={(logsPage + 1) * pageSize >= logsTotalCount || logsLoading}
                      onClick={() => setLogsPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
          <div className="bg-slate-900 p-8 text-white">
            <Shield className="size-12 text-primary mb-4" />
            <DialogTitle className="text-2xl font-black tracking-tight">Grant Administrative Access</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">Elevate a user to administrative status. They will have access to manage students and certificates.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">Authorized Email Address</Label>
              <Input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="admin@ezyintern.com" className="h-12 bg-slate-50 border-none shadow-inner" />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAddStaff} className="h-12 font-black shadow-glow">Finalize Appointment</Button>
              <Button variant="ghost" onClick={() => setIsAddStaffOpen(false)} className="text-slate-500 font-bold">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}><DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
        <div className="bg-primary p-8 text-white relative">
          <div className="flex items-center gap-6">
            <div className="size-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-black shadow-inner">
              {(selectedUser?.full_name || selectedUser?.metadata?.fullName || "P")?.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-3xl font-black tracking-tight">
                {selectedUser?.full_name || selectedUser?.metadata?.fullName || "Profile Details"}
              </DialogTitle>
              <p className="text-primary-foreground/80 font-bold text-sm mt-1">
                {selectedUser?.registration_id ? `REGISTRATION ID: ${selectedUser.registration_id}` : "LEAD / PENDING REGISTRATION"}
              </p>
            </div>
          </div>
          <Badge className="absolute top-8 right-8 bg-white/20 hover:bg-white/30 border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5 backdrop-blur-sm">
            {selectedUser?.status || "Lead"}
          </Badge>
        </div>
        
        {selectedUser && (
          <ScrollArea className="max-h-[75vh]">
            <div className="p-8 space-y-10">
              {/* Personal Section */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <User className="size-4" /> Personal Profile
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Gender</Label><p className="text-sm font-bold text-slate-900">{selectedUser.gender || selectedUser.metadata?.gender || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Email Address</Label><p className="text-sm font-bold text-slate-900 truncate">{selectedUser.email || selectedUser.user_email || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Contact Number</Label><p className="text-sm font-bold text-slate-900">{selectedUser.contact_number || selectedUser.user_phone || "—"}</p></div>
                  <div className="md:col-span-2"><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Parent / Guardian Name</Label><p className="text-sm font-bold text-slate-900">{selectedUser.parent_name || selectedUser.metadata?.parentName || "—"}</p></div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Academic Section */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <GraduationCap className="size-4" /> Academic Credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">University</Label>
                    <p className="text-sm font-black text-slate-900">{selectedUser.university_name || selectedUser.metadata?.university || "—"}</p>
                  </div>
                  <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">College / Institute</Label>
                    <p className="text-sm font-black text-slate-900">{selectedUser.college_name || selectedUser.metadata?.college || "—"}</p>
                  </div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Degree / Program</Label><p className="text-sm font-bold text-slate-900">{selectedUser.degree || selectedUser.metadata?.degree || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Department</Label><p className="text-sm font-bold text-slate-900">{selectedUser.department || selectedUser.metadata?.department || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Subject / Major</Label><p className="text-sm font-bold text-slate-900">{selectedUser.metadata?.subject || selectedUser.metadata?.subject || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Academic Session</Label><p className="text-sm font-bold text-slate-900">{selectedUser.academic_session || selectedUser.metadata?.session || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Current Semester</Label><p className="text-sm font-bold text-slate-900">{selectedUser.class_semester || selectedUser.metadata?.semester || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Roll Identification</Label><p className="text-sm font-bold text-slate-900">{selectedUser.roll_number || selectedUser.metadata?.rollNo || "—"}</p></div>
                </div>
                
                <div className="mt-6 p-6 bg-indigo-600 rounded-3xl text-white shadow-glow">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="size-5" />
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Target Internship Domain</Label>
                  </div>
                  <p className="text-2xl font-black">{selectedUser.internship_domain || selectedUser.metadata?.course || "NOT ASSIGNED"}</p>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Emergency Section */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                  <Phone className="size-4" /> Emergency Protocol
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Contact Name</Label><p className="text-sm font-bold text-slate-900">{selectedUser.emergency_name || selectedUser.metadata?.emName || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Relationship</Label><p className="text-sm font-bold text-slate-900">{selectedUser.emergency_relation || selectedUser.metadata?.emRel || "—"}</p></div>
                  <div><Label className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Contact Phone</Label><p className="text-sm font-bold text-slate-900 font-mono">{selectedUser.emergency_contact || selectedUser.metadata?.emPhone || "—"}</p></div>
                </div>
              </div>

              {selectedUser.reason && (
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Ban className="size-5 text-red-600" />
                    <Label className="text-[10px] uppercase text-red-600 font-black tracking-widest">Abandonment Reason / System Log</Label>
                  </div>
                  <p className="text-sm font-black text-red-700">{selectedUser.reason}</p>
                  <p className="text-[10px] text-red-500/80 font-medium mt-1 italic">This student reached checkout but the session was terminated or failed.</p>
                </div>
              )}
              
              <div className="pt-4 flex justify-end">
                <Button variant="outline" className="rounded-xl font-bold h-11 px-8" onClick={() => setIsViewDialogOpen(false)}>Close Dossier</Button>
              </div>
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

      <Dialog open={isPermsDialogOpen} onOpenChange={setIsPermsDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
          <div className="bg-indigo-600 p-8 text-white">
            <Shield className="size-12 text-white/90 mb-4" />
            <DialogTitle className="text-2xl font-black tracking-tight">Admin Permissions</DialogTitle>
            <DialogDescription className="text-indigo-100 text-sm mt-1">Manage what <strong>{selectedAdminForPerms?.full_name}</strong> can access in their dashboard.</DialogDescription>
          </div>
          <div className="p-8 space-y-4">
            {[
              { id: 'can_manage_students', label: 'Student Management', desc: 'Can view, edit, and filter student records' },
              { id: 'can_manage_classes', label: 'Live Classes', desc: 'Can schedule and manage video sessions' },
              { id: 'can_manage_certificates', label: 'Certificates', desc: 'Can generate and issue internship certificates' },
              { id: 'can_manage_institutions', label: 'Academic Partners', desc: 'Can manage Universities and Colleges' }
            ].map(perm => {
              const userPerms = adminPermissions.find(ap => ap.user_id === selectedAdminForPerms?.id) || {};
              const isEnabled = userPerms[perm.id] ?? true; // default true
              
              return (
                <div key={perm.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-slate-800">{perm.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{perm.desc}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleAdminPermission(selectedAdminForPerms.id, perm.id, isEnabled)}
                    className={isEnabled ? "text-indigo-600" : "text-slate-400"}
                  >
                    {isEnabled ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button className="w-full h-11 font-bold rounded-xl" onClick={() => setIsPermsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="py-8 bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} EzyIntern Super Admin. All rights reserved.</p>
        </div>
      </footer>
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-elegant">
          <div className="bg-red-600 p-8 text-white">
            <Ban className="size-12 text-white/90 mb-4" />
            <DialogTitle className="text-2xl font-black tracking-tight">Factory Reset</DialogTitle>
            <DialogDescription className="text-red-100 text-sm mt-1">This action is irreversible. All student and transaction data will be purged.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2"><Checkbox id="r-students" checked={resetOptions.students} onCheckedChange={v => setResetOptions({...resetOptions, students: !!v})} /><Label htmlFor="r-students">Students</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-payments" checked={resetOptions.payments} onCheckedChange={v => setResetOptions({...resetOptions, payments: !!v})} /><Label htmlFor="r-payments">Transactions</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-leads" checked={resetOptions.leads} onCheckedChange={v => setResetOptions({...resetOptions, leads: !!v})} /><Label htmlFor="r-leads">Leads</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-certs" checked={resetOptions.certs} onCheckedChange={v => setResetOptions({...resetOptions, certs: !!v})} /><Label htmlFor="r-certs">Certificates</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-classes" checked={resetOptions.classes} onCheckedChange={v => setResetOptions({...resetOptions, classes: !!v})} /><Label htmlFor="r-classes">Live Classes</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-institutions" checked={resetOptions.institutions} onCheckedChange={v => setResetOptions({...resetOptions, institutions: !!v})} /><Label htmlFor="r-institutions">Institutions</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="r-domains" checked={resetOptions.domains} onCheckedChange={v => setResetOptions({...resetOptions, domains: !!v})} /><Label htmlFor="r-domains">Domains</Label></div>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold" onClick={() => setResetOptions({students: true, payments: true, leads: true, certs: true, classes: true, institutions: true, domains: true})}>SELECT ALL</Button>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">Type "RESET" to confirm</Label>
              <Input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)} placeholder="RESET" className="h-12 bg-red-50 border-none shadow-inner text-red-600 font-black text-center" />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={resetPlatformData} disabled={processing || !resetConfirmText} className="h-12 font-black shadow-glow">Execute Selected Reset</Button>
              <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)} className="text-slate-500 font-bold">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default SuperAdmin;
