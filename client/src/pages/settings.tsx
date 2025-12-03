import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-700">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
        <SettingsIcon className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-2xl font-heading font-bold text-gray-900">Configuración</h2>
      <p className="text-muted-foreground max-w-md">
        Aquí podrás gestionar tus preferencias, conectar cuentas bancarias y exportar tus datos.
      </p>
    </div>
  );
}
