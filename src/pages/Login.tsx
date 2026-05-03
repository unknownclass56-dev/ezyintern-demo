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
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }
    setResetLoading(true);
    try {
      // 1. Generate a 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Store OTP in database (public.password_resets table)
      const { error: dbError } = await supabase
        .from('password_resets')
        .insert([{ email: resetEmail, otp: generatedOtp }]);
      
      if (dbError) throw new Error("Failed to initialize reset. Please try again.");

      // 3. Send OTP via Vercel API
      const response = await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          otp: generatedOtp,
          to: resetEmail
        })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to send email");

      toast.success("OTP sent successfully to your email!");
      setResetStep("otp");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (resetOtp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    // We just transition to the password step. 
    // Real verification happens in the final RPC call for security.
    toast.success("Code entered! Now set your new password.");
    setResetStep("password");
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    try {
      // Call the secure RPC function to verify OTP and reset password
      const { data, error } = await supabase.rpc('reset_user_password', {
        p_email: resetEmail,
        p_otp: resetOtp,
        p_new_password: newPassword
      });

      if (error) throw error;
      if (!data) throw new Error("Invalid or expired OTP code. Please try again.");

      toast.success("Password updated successfully! You can now login.");
      setShowResetDialog(false);
      setResetStep("email");
      setResetEmail("");
      setResetOtp("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const openResetDialog = () => {
    setResetEmail(email); // Pre-fill if they already typed it
    setResetStep("email");
    setResetOtp("");
    setNewPassword("");
    setShowResetDialog(true);
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
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
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
                <button 
                  type="button" 
                  onClick={openResetDialog}
                  className="text-primary font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin mr-2" />} Login
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              New user? <Link to="/register" className="text-primary font-semibold hover:underline">Register here</Link>
            </p>
          </Card>
        </div>
      </main>

      {/* Forgot Password Flow Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              {resetStep === "email" && "Enter your email address and we will send you a 6-digit OTP code to reset your password."}
              {resetStep === "otp" && `We've sent a 6-digit code to ${resetEmail}.`}
              {resetStep === "password" && "Create a new strong password for your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {resetStep === "email" && (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    value={resetEmail} 
                    onChange={(e) => setResetEmail(e.target.value)} 
                    placeholder="you@example.com" 
                    required 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading && <Loader2 className="size-4 animate-spin mr-2" />} 
                  Send OTP Code
                </Button>
              </form>
            )}

            {resetStep === "otp" && (
              <div className="flex flex-col items-center justify-center space-y-6">
                <InputOTP maxLength={6} value={resetOtp} onChange={setResetOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <Button 
                  className="w-full" 
                  onClick={handleVerifyResetOtp} 
                  disabled={resetLoading || resetOtp.length < 6}
                >
                  {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Code
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Didn't receive the code? {" "}
                  <button 
                    onClick={() => handleSendResetOtp()} 
                    className="text-primary font-bold hover:underline"
                    disabled={resetLoading}
                  >
                    Resend Code
                  </button>
                </p>
              </div>
            )}

            {resetStep === "password" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPw ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Min. 6 characters" 
                      required 
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full" onClick={handleUpdatePassword} disabled={resetLoading || newPassword.length < 6}>
                  {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
};

export default Login;

