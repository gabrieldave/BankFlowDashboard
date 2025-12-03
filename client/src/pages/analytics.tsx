import { Construction } from "lucide-react";

export default function Analytics() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-700">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-heading font-bold text-gray-900">Análisis Avanzado</h2>
      <p className="text-muted-foreground max-w-md">
        Estamos construyendo herramientas de proyección financiera y análisis de patrimonio.
        ¡Pronto estarán disponibles!
      </p>
    </div>
  );
}
