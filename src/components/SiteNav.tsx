import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SiteNav = () => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async (userId: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const roles = (data || []).map(r => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsSuperAdmin(roles.includes("super_admin"));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsAuthed(!!s);
      if (s?.user) checkRole(s.user.id);
      else { setIsAdmin(false); setIsSuperAdmin(false); }
    });

    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
      if (data.session?.user) checkRole(data.session.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden shadow-soft group-hover:shadow-glow transition-smooth">
            <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
          </div>
          <div className="leading-none">
            <div className="font-bold text-2xl tracking-tighter"><span className="text-[#5ea4e8]">Ezy</span><span className="text-black dark:text-white">intern</span></div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:block">Bihar's Trusted Internship Partner</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          <a href="/#why" className="text-muted-foreground hover:text-primary transition-smooth">Why Join</a>
          <Link to="/benefits" className="text-muted-foreground hover:text-primary transition-smooth">Benefits</Link>
          <a href="/#universities" className="text-muted-foreground hover:text-primary transition-smooth">Universities</a>
          <Link to="/verify" className="text-muted-foreground hover:text-primary transition-smooth">Verify</Link>
          <a href="/#contact" className="text-muted-foreground hover:text-primary transition-smooth">Contact</a>
        </div>

        <div className="flex items-center gap-2">
          <a href="tel:7004762654" className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-smooth mr-2">
            <Phone className="size-3.5" /> 7004762654
          </a>
          {isAuthed ? (
            <>
              {isSuperAdmin ? (
                <Button variant="accent" size="sm" onClick={() => navigate("/super-admin")}>Super Admin</Button>
              ) : (
                isAdmin && <Button variant="accent" size="sm" onClick={() => navigate("/admin")}>Admin Panel</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Login</Button>
              <Button variant="accent" size="sm" onClick={() => navigate("/register")}>Register</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
