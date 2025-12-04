import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'wouter';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Sección de Branding e Introducción */}
        <div className="hidden md:block space-y-6 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transform hover:scale-105 transition-transform">
                <span className="text-white font-heading font-black text-4xl">F</span>
              </div>
              <h1 className="text-6xl font-heading font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                FinTrack
              </h1>
            </div>
            <p className="text-2xl font-semibold text-gray-800 leading-tight">
              Controla tus finanzas con inteligencia
            </p>
          </div>
          
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">¿Qué es FinTrack?</h2>
              <p className="text-gray-700 leading-relaxed">
                FinTrack es tu asistente financiero inteligente que transforma tus estados de cuenta bancarios en insights accionables. 
                Analiza automáticamente tus transacciones, categoriza tus gastos y te ayuda a tomar decisiones financieras más informadas.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">✨ Funcionalidades principales:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Análisis automático:</strong> Sube tus estados de cuenta CSV o PDF y obtén análisis instantáneos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Visualizaciones inteligentes:</strong> Gráficos y métricas que te muestran exactamente dónde va tu dinero</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Filtros avanzados:</strong> Analiza por mes, semana, categoría, banco y más</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Insights personalizados:</strong> Descubre patrones de gasto y oportunidades de ahorro</span>
                </li>
              </ul>
            </div>
            
            <div className="pt-4">
              <p className="text-sm text-gray-600 italic">
                "Toma el control de tus finanzas personales con la herramienta más completa y fácil de usar"
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Login */}
        <Card className="w-full max-w-md shadow-xl border-0 mx-auto">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <CardTitle className="text-3xl font-heading font-bold">Bienvenido</CardTitle>
            <CardDescription className="text-base">
              Inicia sesión en tu cuenta para continuar
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
              <Label htmlFor="email">Correo electrónico</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </Link>
              </div>
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
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link href="/register">
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Regístrate aquí
                </button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
      
      {/* Versión móvil de la introducción */}
      <div className="md:hidden mt-8 space-y-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-heading font-black text-3xl">F</span>
          </div>
          <h1 className="text-4xl font-heading font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            FinTrack
          </h1>
        </div>
        <p className="text-lg font-semibold text-gray-800">
          Controla tus finanzas con inteligencia
        </p>
        <p className="text-sm text-gray-600 px-4">
          Analiza automáticamente tus estados de cuenta, categoriza tus gastos y toma decisiones financieras más informadas.
        </p>
      </div>
    </div>
  );
}



