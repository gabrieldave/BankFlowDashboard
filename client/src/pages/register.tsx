import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'wouter';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, passwordConfirm, name || undefined);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario. El email puede estar en uso.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 8) return { strength: 1, label: 'Débil' };
    if (password.length < 12) return { strength: 2, label: 'Media' };
    return { strength: 3, label: 'Fuerte' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <span className="text-white font-heading font-bold text-2xl">F</span>
          </div>
          <CardTitle className="text-3xl font-heading font-bold">Crear cuenta</CardTitle>
          <CardDescription className="text-base">
            Regístrate para comenzar a gestionar tus finanzas
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
              <Label htmlFor="name">Nombre (opcional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
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
                />
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= strength.strength
                            ? strength.strength === 1
                              ? 'bg-red-500'
                              : strength.strength === 2
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {strength.label && `Fuerza: ${strength.label}`}
                    {password.length < 8 && ' (mínimo 8 caracteres)'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar contraseña *</Label>
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
                />
              </div>
              {passwordConfirm.length > 0 && password === passwordConfirm && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Las contraseñas coinciden</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || password !== passwordConfirm || password.length < 8}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login">
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Inicia sesión aquí
                </button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



