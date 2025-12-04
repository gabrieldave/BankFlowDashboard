import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  UploadCloud, 
  PieChart, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user, logout } = useAuth();

  // Verificar si hay una carga en progreso
  useEffect(() => {
    const checkUploadStatus = () => {
      const uploadInProgress = localStorage.getItem('uploadInProgress');
      setIsUploading(uploadInProgress === 'true');
    };

    // Verificar al montar
    checkUploadStatus();

    // Verificar periódicamente
    const interval = setInterval(checkUploadStatus, 1000);

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'uploadInProgress') {
        setIsUploading(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Usuario';
  const displayEmail = user?.email || '';
  const initials = getInitials(user?.name, user?.email);

  const navItems = [
    { href: "/", icon: UploadCloud, label: "Subir Archivos", disabled: false },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", disabled: isUploading },
    { href: "/analytics", icon: PieChart, label: "Análisis", disabled: isUploading },
    { href: "/settings", icon: Settings, label: "Configuración", disabled: false },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="font-heading font-bold text-xl">FinTrack</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-primary rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xl">F</span>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight">FinTrack</span>
          </div>

          <nav className="space-y-2 flex-1">
            <TooltipProvider>
              {navItems.map((item) => {
                const isActive = location === item.href;
                const isDisabled = item.disabled;
                
                const navItem = (
                  <div 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-primary text-white shadow-md shadow-primary/20" 
                        : isDisabled
                        ? "text-muted-foreground/50 cursor-not-allowed opacity-50"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                    )}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    {isDisabled && isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <item.icon className={cn(
                        "h-5 w-5", 
                        isActive ? "text-white" : isDisabled 
                          ? "text-muted-foreground/50" 
                          : "text-muted-foreground group-hover:text-foreground"
                      )} />
                    )}
                    <span className="font-medium">{item.label}</span>
                    {isDisabled && (
                      <span className="ml-auto text-xs text-muted-foreground/70">
                        (Cargando...)
                      </span>
                    )}
                  </div>
                );

                if (isDisabled) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div>{navItem}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Espera a que termine la carga del archivo para acceder a {item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link key={item.href} href={item.href}>
                    {navItem}
                  </Link>
                );
              })}
            </TooltipProvider>
          </nav>

          <div className="pt-6 border-t mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent cursor-pointer transition-colors w-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
