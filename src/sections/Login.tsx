import { AxiosError } from 'axios';
import { Loader2, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { hasAuthToken, setAuthToken } from '@/lib/auth';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (hasAuthToken()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<{ token: string }>('/login', {
        email: email.trim(),
        password,
      });

      setAuthToken(response.data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (requestError) {
      const fallback = 'Login failed. Check your email and password.';
      if (requestError instanceof AxiosError) {
        const apiMessage = (requestError.response?.data as { message?: string } | undefined)?.message;
        setError(apiMessage ?? fallback);
      } else {
        setError(fallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lock className="h-5 w-5" />
            Admin Login
          </CardTitle>
          <CardDescription>Sign in to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@yourstore.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <p className="text-xs text-muted-foreground">
              Registration is disabled by default after initial admin setup.
            </p>
            {location.state && (
              <p className="text-xs text-muted-foreground">
                Please log in to continue to the admin dashboard.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default Login;
