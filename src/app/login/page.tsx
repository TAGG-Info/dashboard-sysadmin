'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Identifiants invalides. Veuillez reessayer.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-border/50 rounded-2xl border p-8 shadow-lg backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="text-foreground mb-2 text-2xl font-bold">
              {process.env.NEXT_PUBLIC_APP_NAME || 'SysAdmin Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm">Connectez-vous pour acceder au tableau de bord</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="text-muted-foreground mb-1.5 block text-sm font-medium">
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-border text-foreground placeholder-muted-foreground/50 focus:ring-primary w-full rounded-lg border px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                placeholder="prenom.nom"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-muted-foreground mb-1.5 block text-sm font-medium">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border text-foreground placeholder-muted-foreground/50 focus:ring-primary w-full rounded-lg border px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                placeholder="Mot de passe"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground focus:ring-primary focus:ring-offset-background w-full rounded-lg px-4 py-2.5 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
