import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2, XCircle, Loader2, Award, User, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const VerifyCertificate = () => {
  const [certId, setCertId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState(false);

  const handleVerify = async () => {
    if (!certId.trim()) return toast.error("Please enter a Certificate ID");
    setLoading(true);
    setError(false);
    setResult(null);

    try {
      // 1. Try searching by Certificate ID
      let { data, error: sError } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", certId.trim())
        .maybeSingle();

      // 2. If not found, try searching by Email or Phone via the students table
      if (!data) {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .or(`email.eq.${certId.trim()},contact_number.eq.${certId.trim()}`)
          .maybeSingle();

        if (student) {
          const { data: certData } = await supabase
            .from("certificates")
            .select("*")
            .eq("user_id", student.id)
            .maybeSingle();
          data = certData;
        }
      }

      if (data) {
        setResult(data);
        toast.success("Certificate Verified Successfully!");
      } else {
        setError(true);
        toast.error("No certificate found");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteNav />
      <main className="flex-1 py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Search className="size-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4">Certificate Verification</h1>
            <p className="text-slate-500 max-w-xl mx-auto">
              Verify the authenticity of EzyIntern certificates. Enter the unique Certificate ID printed on the document.
            </p>
          </div>

          <Card className="p-8 md:p-12 shadow-elegant border-none mb-12">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <Input 
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  placeholder="Certificate ID, Email or Phone" 
                  className="h-14 pl-12 text-lg font-bold border-2 focus:border-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
              <Button size="lg" className="h-14 px-10 font-bold text-lg" onClick={handleVerify} disabled={loading}>
                {loading ? <Loader2 className="size-5 animate-spin" /> : "Verify Now"}
              </Button>
            </div>
          </Card>

          {result && (
            <Card className="overflow-hidden border-none shadow-2xl animate-fade-in-up">
              <div className="bg-green-600 p-6 text-white flex items-center gap-4">
                <CheckCircle2 className="size-8" />
                <div>
                  <h3 className="text-xl font-bold">Authentic Certificate</h3>
                  <p className="text-sm opacity-80">This certificate is verified and issued by EzyIntern.</p>
                </div>
              </div>
              <div className="p-8 md:p-12 bg-white grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                      <User className="size-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Intern Name</p>
                      <p className="text-xl font-black">{result.student_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                      <Award className="size-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Program / Domain</p>
                      <p className="text-xl font-black">{result.internship_name}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                      <Calendar className="size-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                      <p className="font-bold">{result.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Certificate Status</p>
                      <p className="font-bold text-green-600">{result.status || "Active"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="p-10 text-center border-none shadow-elegant bg-red-50 animate-fade-in-up">
              <XCircle className="size-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-900 mb-2">Verification Failed</h3>
              <p className="text-red-700">The certificate ID you entered was not found in our records. Please double-check the ID or contact support.</p>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default VerifyCertificate;
