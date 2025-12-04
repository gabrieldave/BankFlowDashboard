import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, CheckCircle2, AlertCircle, FileType, Loader2, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, getBanks, type Bank } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Analizando transacciones...");
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [customBank, setCustomBank] = useState<string>('');
  const [useCustomBank, setUseCustomBank] = useState<boolean>(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Cargar lista de bancos disponibles
  useEffect(() => {
    getBanks()
      .then(setBanks)
      .catch((error) => {
        console.error("Error cargando bancos:", error);
      });
  }, []);

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
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo primero",
        variant: "destructive",
      });
      return;
    }

    // Validar que se haya seleccionado o escrito un banco
    const bankToUse = useCustomBank ? customBank.trim() : selectedBank;
    if (!bankToUse || bankToUse === '') {
      toast({
        title: "Banco requerido",
        description: "Por favor, selecciona un banco de la lista o escribe el nombre de tu banco",
        variant: "destructive",
      });
      return;
    }

    processFile(selectedFile, bankToUse);
  };

  // Restaurar estado de carga al montar el componente
  useEffect(() => {
    const uploadInProgress = localStorage.getItem('uploadInProgress');
    const uploadStartTime = localStorage.getItem('uploadStartTime');
    
    if (uploadInProgress === 'true' && uploadStartTime) {
      const startTime = parseInt(uploadStartTime);
      const elapsed = Date.now() - startTime;
      
      // Si han pasado más de 5 minutos (300000ms), asumir que terminó y limpiar
      if (elapsed > 300000) {
        console.log('Upload en progreso detectado pero ha pasado mucho tiempo, limpiando estado...');
        localStorage.removeItem('uploadInProgress');
        localStorage.removeItem('uploadStartTime');
        localStorage.removeItem('uploadProgress');
        setIsUploading(false);
        setUploadProgress(0);
        setStatusMessage("");
        toast({
          title: "Procesamiento completado",
          description: "El archivo ya fue procesado. Puedes ver tus transacciones en el Dashboard.",
          duration: 5000,
        });
        return undefined;
      }
      
      // Hay un upload en progreso, restaurar el estado
      setIsUploading(true);
      uploadStartTimeRef.current = startTime;
      
      // Restaurar progreso guardado o calcular estimado
      const savedProgress = localStorage.getItem('uploadProgress');
      if (savedProgress) {
        setUploadProgress(parseInt(savedProgress));
      } else {
        const estimatedProgress = Math.min(95, Math.floor((elapsed / 300000) * 95)); // Estimación basada en tiempo
        setUploadProgress(estimatedProgress);
      }
      setStatusMessage("Procesando archivo... (continuando en segundo plano)");
      
      // Mostrar notificación de que sigue cargando
      toast({
        title: "Seguimos cargando",
        description: "Tu archivo se sigue procesando. El progreso continúa en segundo plano.",
      });
      
      // Continuar el progreso visual
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          const newProgress = Math.min(prev + 0.5, 95);
          localStorage.setItem('uploadProgress', newProgress.toString());
          return newProgress;
        });
      }, 500);
      
      // Limpiar intervalo cuando el componente se desmonte
      return () => clearInterval(progressInterval);
    }
    
    return undefined;
  }, [toast]);

  // Detectar cuando el usuario regresa a la pestaña
  useEffect(() => {
    let wasHidden = false;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // El usuario se fue a otra pestaña
        wasHidden = true;
      } else if (document.visibilityState === 'visible' && wasHidden) {
        // El usuario regresó a la pestaña
        wasHidden = false;
        
        // Verificar si hay un upload en progreso
        const uploadInProgress = localStorage.getItem('uploadInProgress');
        const uploadStartTime = localStorage.getItem('uploadStartTime');
        
        if (uploadInProgress === 'true' && uploadStartTime) {
          const startTime = parseInt(uploadStartTime);
          const elapsed = Date.now() - startTime;
          
          // Si han pasado más de 5 minutos, limpiar el estado
          if (elapsed > 300000) {
            console.log('Upload en progreso detectado pero ha pasado mucho tiempo, limpiando estado...');
            localStorage.removeItem('uploadInProgress');
            localStorage.removeItem('uploadStartTime');
            localStorage.removeItem('uploadProgress');
            setIsUploading(false);
            setUploadProgress(0);
            setStatusMessage("");
            uploadStartTimeRef.current = null;
            toast({
              title: "Procesamiento completado",
              description: "El archivo ya fue procesado. Puedes ver tus transacciones en el Dashboard.",
              duration: 5000,
            });
            return;
          }
          
          // Actualizar el progreso estimado
          if (isUploading) {
            const estimatedProgress = Math.min(95, Math.floor((elapsed / 300000) * 95));
            setUploadProgress(estimatedProgress);
            
            // Mostrar mensaje indicando que sigue cargando
            toast({
              title: "Seguimos cargando",
              description: "Tu archivo se sigue procesando. El progreso continúa en segundo plano.",
            });
            
            // Actualizar el mensaje de estado
            setStatusMessage("Procesando archivo... (continuando en segundo plano)");
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUploading, toast]);

  const processFile = async (file: File, bank?: string) => {
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
      if (!abortController.signal.aborted && document.visibilityState === 'visible') {
        setStatusMessage(statusMessages[messageIndex % statusMessages.length]);
        messageIndex++;
      }
    }, 2000);

    // Progreso más suave y realista - continuar incluso si la pestaña está inactiva
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (!abortController.signal.aborted) {
        // Incremento más lento al principio, más rápido al final
        const increment = progress < 30 ? 1 : progress < 70 ? 2 : progress < 90 ? 1.5 : 0.5;
        progress = Math.min(progress + increment, 95);
        setUploadProgress(progress);
        
        // Guardar progreso en localStorage para persistencia
        localStorage.setItem('uploadProgress', progress.toString());
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
      const result = await uploadFile(file, selectedBank || undefined);
      
      // Procesamiento completado exitosamente
      cleanup();
      setUploadProgress(100);
      
      // Limpiar estado de localStorage
      localStorage.removeItem('uploadInProgress');
      localStorage.removeItem('uploadStartTime');
      localStorage.removeItem('uploadProgress');
      uploadStartTimeRef.current = null;

      // Verificar si el archivo ya fue procesado
      if (result.alreadyProcessed) {
        setStatusMessage("Archivo ya procesado");
        toast({
          title: "Archivo ya procesado",
          description: result.message || "Este archivo ya fue procesado anteriormente. No se agregaron transacciones duplicadas.",
          variant: "default",
        });
        
        // Esperar un momento antes de redirigir
        setTimeout(() => {
          toast({
            title: "✅ Ya puedes ver el Dashboard",
            description: "El procesamiento ha terminado. Puedes acceder al Dashboard ahora.",
            duration: 5000,
          });
          setLocation("/dashboard");
        }, 2000);
      } else {
        setStatusMessage("¡Procesamiento completado!");
        setTimeout(() => {
          let description = result.message;
          if (result.duplicates && result.duplicates > 0) {
            description += ` (${result.duplicates} duplicadas omitidas)`;
          }
          toast({
            title: "✅ ¡Archivo procesado! Ya puedes ver el Dashboard",
            description: description + " Puedes acceder al Dashboard ahora.",
            duration: 5000,
          });
          setLocation("/dashboard");
        }, 1000);
      }
    } catch (error: any) {
      cleanup();
      
      // Error al procesar, mostrar mensaje
      setIsUploading(false);
      setUploadProgress(0);
      setStatusMessage("Error al procesar");
      
      // Limpiar estado de localStorage
      localStorage.removeItem('uploadInProgress');
      localStorage.removeItem('uploadStartTime');
      localStorage.removeItem('uploadProgress');
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

              {/* Mostrar archivo seleccionado y selector de banco */}
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md mt-6 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedBank('');
                        setCustomBank('');
                        setUseCustomBank(false);
                      }}
                      className="text-muted-foreground hover:text-gray-900"
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Banco <span className="text-red-500">*</span>
                    </label>
                    
                    {!useCustomBank ? (
                      <>
                        <Select 
                          value={selectedBank || ""} 
                          onValueChange={(value) => {
                            setSelectedBank(value);
                            setCustomBank('');
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona un banco de la lista" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.name} {bank.country && `(${bank.country})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomBank(true);
                            setSelectedBank('');
                          }}
                          className="text-sm text-primary hover:underline w-full text-left"
                        >
                          Mi banco no está en la lista
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={customBank}
                          onChange={(e) => setCustomBank(e.target.value)}
                          placeholder="Escribe el nombre de tu banco"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomBank(false);
                            setCustomBank('');
                          }}
                          className="text-sm text-primary hover:underline w-full text-left"
                        >
                          Volver a la lista de bancos
                        </button>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={handleStartUpload}
                    size="lg"
                    disabled={!selectedFile || (!useCustomBank && !selectedBank) || (useCustomBank && !customBank.trim())}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-upload"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Procesar archivo
                  </Button>
                </motion.div>
              )}
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
