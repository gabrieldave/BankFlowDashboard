import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, CheckCircle2, AlertCircle, FileType } from "lucide-react";
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

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        toast({
          title: "¡Archivo procesado!",
          description: result.message,
        });
        setLocation("/dashboard");
      }, 500);
    } catch (error: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      
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
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <FileText className="w-10 h-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gray-900">Procesando archivo...</h3>
                <p className="text-muted-foreground" data-testid="text-progress">Analizando transacciones...</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Progreso</span>
                  <span data-testid="text-percentage">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
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
