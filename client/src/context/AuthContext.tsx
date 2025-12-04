import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useRoute } from 'wouter';
import pb from '@/lib/pocketbase';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatar?: string;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string, name?: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string, passwordConfirm: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth();
    
    // Escuchar cambios de autenticación
    pb.authStore.onChange((token, model) => {
      if (model) {
        setUser({
          id: model.id,
          email: model.email || '',
          username: model.username || model.email?.split('@')[0] || '',
          name: model.name || model.username || model.email?.split('@')[0] || '',
          avatar: model.avatar || '',
          verified: model.verified || false,
        });
      } else {
        setUser(null);
      }
    });
  }, []);

  const checkAuth = async () => {
    try {
      // Verificar si hay un token válido
      if (pb.authStore.isValid) {
        // Actualizar el token si es necesario
        await pb.collection('users').authRefresh();
        const model = pb.authStore.model;
        if (model) {
          setUser({
            id: model.id,
            email: model.email || '',
            username: model.username || model.email?.split('@')[0] || '',
            name: model.name || model.username || model.email?.split('@')[0] || '',
            avatar: model.avatar || '',
            verified: model.verified || false,
          });
        }
      }
    } catch (error) {
      // Si el token no es válido, limpiar
      pb.authStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      const model = authData.record;
      
      setUser({
        id: model.id,
        email: model.email || '',
        username: model.username || model.email?.split('@')[0] || '',
        name: model.name || model.username || model.email?.split('@')[0] || '',
        avatar: model.avatar || '',
        verified: model.verified || false,
      });

      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido de vuelta, ${model.name || model.email?.split('@')[0] || 'Usuario'}!`,
      });

      setLocation('/dashboard');
    } catch (error: any) {
      console.error('Error en login:', error);
      throw new Error(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  const register = async (email: string, password: string, passwordConfirm: string, name?: string) => {
    try {
      // Crear el usuario
      const userData: any = {
        email,
        password,
        passwordConfirm,
      };

      if (name) {
        userData.name = name;
      }

      // Crear usuario (esto enviará un email de verificación si está configurado)
      await pb.collection('users').create(userData);

      // Iniciar sesión automáticamente después del registro
      await login(email, password);
    } catch (error: any) {
      console.error('Error en registro:', error);
      throw new Error(error.message || 'Error al registrar usuario. El email puede estar en uso.');
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
    setLocation('/login');
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email);
      toast({
        title: "Email enviado",
        description: "Revisa tu correo para restablecer tu contraseña.",
      });
    } catch (error: any) {
      console.error('Error en requestPasswordReset:', error);
      throw new Error(error.message || 'Error al solicitar restablecimiento de contraseña.');
    }
  };

  const confirmPasswordReset = async (token: string, password: string, passwordConfirm: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido restablecida correctamente. Puedes iniciar sesión ahora.",
      });
    } catch (error: any) {
      console.error('Error en confirmPasswordReset:', error);
      throw new Error(error.message || 'Error al restablecer la contraseña. El token puede ser inválido o haber expirado.');
    }
  };

  const refreshAuth = async () => {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('users').authRefresh();
        await checkAuth();
      }
    } catch (error) {
      pb.authStore.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

