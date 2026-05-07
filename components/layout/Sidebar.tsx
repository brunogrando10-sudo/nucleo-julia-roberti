"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/patients", icon: Users, label: "Pacientes" },
  { href: "/agenda", icon: Calendar, label: "Agenda" },
  { href: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { href: "/cobranca", icon: MessageSquare, label: "Cobrança" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-terracota flex items-center justify-center flex-shrink-0">
            <span className="text-white font-serif text-sm font-semibold">J</span>
          </div>
          <div>
            <p className="font-serif text-white text-sm font-medium leading-tight">
              Julia Roberti
            </p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest leading-tight">
              Núcleo de Psicologia
            </p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                ${active
                  ? "bg-brand-terracota text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50
                     hover:text-white hover:bg-white/10 transition-all text-sm font-medium w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-brand-dark fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Header mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-brand-dark flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-terracota flex items-center justify-center">
            <span className="text-white font-serif text-xs font-semibold">J</span>
          </div>
          <p className="font-serif text-white text-sm">Julia Roberti</p>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white/70 hover:text-white p-1"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-56 bg-brand-dark">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
