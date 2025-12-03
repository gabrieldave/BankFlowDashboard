import { useState, useEffect } from "react";
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

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage("Iniciando procesamiento...");

    // Simular progreso más realista con mensajes dinámicos
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      setStatusMessage(statusMessages[messageIndex % statusMessages.length]);
      messageIndex++;
    }, 2000);

    // Progreso más suave y realista
    let progress = 0;
    const progressInterval = setInterval(() => {
      // Incremento más lento al principio, más rápido al final
      const increment = progress < 30 ? 1 : progress < 70 ? 2 : progress < 90 ? 1.5 : 0.5;
      progress = Math.min(progress + increment, 95);
      setUploadProgress(progress);
    }, 300);

    try {
      const result = await uploadFile(file);
      
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setUploadProgress(100);
      setStatusMessage("¡Procesamiento completado!");

      setTimeout(() => {
        toast({
          title: "¡Archivo procesado!",
          description: result.message,
        });
        setLocation("/dashboard");
      }, 1000);
    } catch (error: any) {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setIsUploading(false);
      setUploadProgress(0);
      setStatusMessage("Error al procesar");
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
    }
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
