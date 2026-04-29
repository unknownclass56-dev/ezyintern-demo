import { GraduationCap, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export const SiteFooter = () => (
  <footer id="contact" className="border-t border-border bg-secondary/40">
    <div className="container mx-auto px-4 py-14">
      <div className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden">
              <img src="/logo.png" alt="EzyIntern" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tighter"><span className="text-[#5ea4e8]">Ezy</span><span className="text-black dark:text-white">intern</span></div>
              <div className="text-xs text-muted-foreground">Bihar's Trusted Internship Partner</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            A secure platform for UGC-mandated internship registration and certificate verification, trusted by universities across Bihar and beyond.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-base mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-primary transition-smooth">Login</Link></li>
            <li><Link to="/register" className="hover:text-primary transition-smooth">Register</Link></li>
            <li><Link to="/verify" className="hover:text-primary transition-smooth">Verify Certificate</Link></li>
            <li><a href="#why" className="hover:text-primary transition-smooth">Why Join</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-base mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Phone className="size-4 mt-0.5 text-primary" /><a href="tel:7004762654" className="hover:text-primary">7004762654</a></li>
            <li className="flex items-start gap-2"><Mail className="size-4 mt-0.5 text-primary" /><span>support@ezyintern.in</span></li>
            <li className="flex items-start gap-2"><MapPin className="size-4 mt-0.5 text-primary" /><span>Patna, Bihar</span></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} EzyIntern. All rights reserved.</p>
        <p>Call us at: <a href="tel:7004762654" className="text-primary font-semibold">7004762654</a></p>
      </div>
    </div>
  </footer>
);
