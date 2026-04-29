import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    
    // Check roles after login
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id);
      const rolesList = (roles || []).map((r: any) => r.role);
      if (rolesList.includes("super_admin")) {
        navigate("/super-admin");
        return;
      }
      if (rolesList.includes("admin")) {
        navigate("/admin");
        return;
      }
    }
    
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="flex-1 gradient-soft py-12 md:py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto p-8 md:p-10 shadow-elegant animate-fade-in-up">
            <div className="flex justify-center mb-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="size-12 rounded-xl overflow-hidden shadow-elegant">
                  <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
                </div>
                <span className="text-2xl font-bold tracking-tighter text-slate-900">EzyIntern</span>
              </Link>
            </div>
            <div className="text-center mb-7">
              <h1 className="text-3xl font-bold mb-1">Welcome Back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your EzyIntern account</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email / Mobile Number</Label>
                <Input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-primary font-medium hover:underline" onClick={(e) => { e.preventDefault(); toast.info("Password reset coming soon. Call 7544090878 for help."); }}>
                  Forgot password?
                </a>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Login
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              New user? <Link to="/register" className="text-primary font-semibold hover:underline">Register here</Link>
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Login;
