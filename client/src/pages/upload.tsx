import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, CheckCircle2, AlertCircle, FileType, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/api";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Analizando transacciones...");
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStartTimeRef = useRef<number | null>(null);
  
  // Mensajes dinámicos que rotan durante el procesamiento
  const statusMessages = [
    "Extrayendo texto del PDF...",
    "Analizando transacciones con IA...",
    "Clasificando categorías...",
    "Procesando páginas...",
    "Identificando montos y fechas...",
    "Casi terminamos...",
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Detectar cuando el usuario regresa a la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isUploading) {
        // El usuario regresó a la pestaña y hay un upload en progreso
        // Verificar si el upload completó mientras estaba fuera
        const uploadStartTime = uploadStartTimeRef.current;
        if (uploadStartTime) {
          const elapsed = Date.now() - uploadStartTime;
          // Si han pasado más de 30 segundos, es probable que el upload haya terminado
          // Mostrar mensaje informativo
          if (elapsed > 30000) {
            toast({
              title: "Procesamiento en curso",
              description: "Tu archivo se está procesando. Los datos aparecerán en el dashboard cuando termine.",
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUploading, toast]);

  const processFile = async (file: File) => {
    // Cancelar cualquier petición anterior solo si el usuario está en la misma página
    // No cancelar si el usuario navegó (permitir procesamiento en segundo plano)
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      // Solo cancelar si realmente queremos (por ejemplo, si suben otro archivo)
      // abortControllerRef.current.abort();
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage("Iniciando procesamiento...");
    uploadStartTimeRef.current = Date.now();

    // Guardar estado en localStorage para persistencia
    localStorage.setItem('uploadInProgress', 'true');
    localStorage.setItem('uploadStartTime', Date.now().toString());

    // AbortController - pero NO lo usaremos para cancelar al navegar
    // Solo para cancelar si el usuario sube otro archivo
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Simular progreso más realista con mensajes dinámicos
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (!abortController.signal.aborted) {
        setStatusMessage(statusMessages[messageIndex % statusMessages.length]);
        messageIndex++;
      }
    }, 2000);

    // Progreso más suave y realista
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (!abortController.signal.aborted) {
        // Incremento más lento al principio, más rápido al final
        const increment = progress < 30 ? 1 : progress < 70 ? 2 : progress < 90 ? 1.5 : 0.5;
        progress = Math.min(progress + increment, 95);
        setUploadProgress(progress);
      }
    }, 300);

    // Cleanup function para limpiar intervalos
    const cleanup = () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };

    try {
      // NO pasar signal para que el procesamiento continúe aunque el usuario navegue
      // El procesamiento en el servidor continuará y guardará los datos
      const result = await uploadFile(file);
      
      // Procesamiento completado exitosamente
      cleanup();
      setUploadProgress(100);
      setStatusMessage("¡Procesamiento completado!");
      
      // Limpiar estado de localStorage
      localStorage.removeItem('uploadInProgress');
      localStorage.removeItem('uploadStartTime');
      uploadStartTimeRef.current = null;

      setTimeout(() => {
        let description = result.message;
        if (result.duplicates && result.duplicates > 0) {
          description += ` (${result.duplicates} duplicadas omitidas)`;
        }
        toast({
          title: "¡Archivo procesado!",
          description,
        });
        setLocation("/dashboard");
      }, 1000);
    } catch (error: any) {
      cleanup();
      
      // Error al procesar, mostrar mensaje
      setIsUploading(false);
      setUploadProgress(0);
      setStatusMessage("Error al procesar");
      
      // Limpiar estado de localStorage
      localStorage.removeItem('uploadInProgress');
      localStorage.removeItem('uploadStartTime');
      uploadStartTimeRef.current = null;
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
    }

    // Cleanup al desmontar
    return () => {
      abortController.abort();
      cleanup();
    };
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-heading font-bold text-gray-900">Sube tus estados de cuenta</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Analizamos tus archivos CSV o PDF automáticamente y categorizamos cada transacción.
        </p>
      </div>

      <Card 
        className={`
          relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
          flex flex-col items-center justify-center text-center min-h-[400px]
          ${isDragging ? 'border-primary bg-blue-50 scale-[1.02]' : 'border-gray-200 bg-white'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence mode="wait">
          {!isUploading ? (
            <motion.div 
              key="upload-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gray-900">Arrastra y suelta tu archivo aquí</h3>
                <p className="text-muted-foreground">Soporta CSV y PDF (máx. 10MB)</p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <span className="text-sm text-gray-400 uppercase tracking-widest font-medium">O BIEN</span>
              </div>

              <div>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept=".csv,.pdf"
                  data-testid="input-file"
                />
                <label htmlFor="file-upload">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="cursor-pointer rounded-xl border-primary/20 hover:border-primary hover:bg-blue-50 text-primary font-semibold px-8" 
                    asChild
                    data-testid="button-browse"
                  >
                    <span>Explorar archivos</span>
                  </Button>
                </label>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="processing-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6"
            >
              {/* Spinner animado */}
              <motion.div 
                className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mx-auto"
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </motion.div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gray-900">Procesando archivo...</h3>
                <motion.p 
                  key={statusMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-muted-foreground min-h-[24px] flex items-center justify-center"
                  data-testid="text-progress"
                >
                  {statusMessage}
                </motion.p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Progreso</span>
                  <span data-testid="text-percentage">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Por favor espera, esto puede tomar unos minutos...
                </p>
                <p className="text-xs text-blue-600 text-center mt-1 font-medium">
                  💡 Puedes cambiar de pestaña o navegar, el procesamiento continuará en segundo plano
                </p>
              </div>

              {/* Indicador de actividad adicional */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <motion.div
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-gray-50/50 rounded-2xl" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {[
          { icon: CheckCircle2, title: "CSV & PDF", desc: "Procesamiento automático de ambos formatos" },
          { icon: FileType, title: "Categorización IA", desc: "Identifica automáticamente el tipo de gasto" },
          { icon: AlertCircle, title: "Privacidad Total", desc: "Tus datos se procesan de forma segura" }
        ].map((feature, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-white shadow-sm border border-gray-100">
            <feature.icon className="w-6 h-6 text-primary mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
