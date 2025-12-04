import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { confirmPasswordReset } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Obtener el token de la URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Token de restablecimiento no válido o faltante');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!token) {
      setError('Token de restablecimiento no válido');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(token, password, passwordConfirm);
      setSuccess(true);
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña. El token puede ser inválido o haber expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-heading font-bold">Contraseña restablecida</CardTitle>
            <CardDescription>
              Tu contraseña ha sido actualizada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Redirigiendo al inicio de sesión...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <span className="text-white font-heading font-bold text-2xl">F</span>
          </div>
          <CardTitle className="text-3xl font-heading font-bold">Nueva contraseña</CardTitle>
          <CardDescription className="text-base">
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar nueva contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || password !== passwordConfirm || password.length < 8 || !token}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                <>
                  Restablecer contraseña
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



