"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-light text-brand-dark tracking-wide">
            Julia Roberti
          </h1>
          <p className="text-brand-nude text-sm mt-1 tracking-widest uppercase font-medium">
            Núcleo de Psicologia
          </p>
          <div className="w-12 h-px bg-brand-terracota mx-auto mt-4" />
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-nude/30">
          <h2 className="font-serif text-2xl text-brand-dark font-light mb-6">
            Acesso ao sistema
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-brand-dark/70 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-brand-nude/50 bg-brand-light/30
                           text-brand-dark placeholder:text-brand-nude/60
                           focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium
                           transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark/70 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-brand-nude/50 bg-brand-light/30
                           text-brand-dark placeholder:text-brand-nude/60
                           focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium
                           transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-terracota hover:bg-brand-terracota/90 text-white
                         rounded-lg font-medium transition-all text-sm tracking-wide
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-brand-nude mt-6">
          Sistema exclusivo para uso interno
        </p>
      </div>
    </div>
  );
}
