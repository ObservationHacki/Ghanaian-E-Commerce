import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ShoppingBag } from 'lucide-react';

export function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirect = new URLSearchParams(search).get('redirect') || '/';
  const comingFromCheckout = redirect === '/checkout';
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLocation(redirect);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {comingFromCheckout && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <ShoppingBag className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Sign in to complete your purchase
            </p>
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter mb-2">KUMASI</h1>
          <p className="text-muted-foreground">
            {comingFromCheckout ? 'Sign in to place your order' : 'Sign in to your account'}
          </p>
        </div>

        <Card className="rounded-3xl border-none shadow-md">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-full font-semibold text-base"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our{' '}
          <span className="underline cursor-pointer">Terms of Service</span> and{' '}
          <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
