import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="responsive-modal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Configurações de Tema
        </CardTitle>
        <CardDescription>
          Escolha o tema da aplicação que melhor se adequa à sua preferência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Aparência</Label>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer flex-1">
                <Sun className="h-4 w-4" />
                <span className="text-sm">Claro</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer flex-1">
                <Moon className="h-4 w-4" />
                <span className="text-sm">Escuro</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer flex-1">
                <Monitor className="h-4 w-4" />
                <span className="text-sm">Sistema</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Prévia</Label>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Exemplo de card</span>
              <Button size="sm" variant="secondary">Botão</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Este é um exemplo de como o tema selecionado aparecerá na aplicação.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}