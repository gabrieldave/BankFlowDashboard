import { useState } from "react";
import { Settings as SettingsIcon, Save, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
];

export default function Settings() {
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('MXN');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar moneda guardada del localStorage
  useState(() => {
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'MXN';
    setSelectedCurrency(savedCurrency);
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Guardar en localStorage
      localStorage.setItem('defaultCurrency', selectedCurrency);
      
      toast({
        title: "Configuración guardada",
        description: `Moneda por defecto actualizada a ${CURRENCIES.find(c => c.code === selectedCurrency)?.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">Configuración</h1>
          <p className="text-muted-foreground">Gestiona tus preferencias y ajustes</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-600" />
              <CardTitle>Moneda</CardTitle>
            </div>
            <CardDescription>
              Selecciona tu moneda por defecto. El sistema detectará automáticamente la moneda de tus archivos, pero puedes establecer una preferencia aquí.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda por defecto</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Selecciona una moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{currency.symbol}</span>
                        <span>{currency.name} ({currency.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Esta moneda se usará cuando no se pueda detectar automáticamente del archivo.
              </p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar configuración
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detección automática</CardTitle>
            <CardDescription>
              El sistema detecta automáticamente la moneda de tus archivos basándose en:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Símbolos de moneda ($, €, £, etc.)</li>
              <li>Códigos ISO (MXN, USD, EUR, etc.)</li>
              <li>Contexto geográfico (nombres de bancos, países)</li>
              <li>Formato numérico (separadores de miles y decimales)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
