import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CreditCard, Calendar, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CancelSubscription() {
  const [cancellationReason, setCancellationReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (data: { motivo: string }) => {
      return apiRequest("/api/subscription/cancel", {
        method: "POST",
        data: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de cancelamento foi processada com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      // Redirecionar para dashboard após cancelamento
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar cancelamento",
        variant: "destructive",
      });
    },
  });

  const handleCancelSubscription = () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do cancelamento.",
        variant: "destructive",
      });
      return;
    }

    cancelSubscriptionMutation.mutate({
      motivo: cancellationReason.trim()
    });
  };

  const reasonOptions = [
    "Preço muito alto",
    "Não uso mais o serviço",
    "Encontrei alternativa melhor",
    "Problemas técnicos",
    "Atendimento insatisfatório",
    "Recursos insuficientes",
    "Outro"
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            Cancelar Assinatura
          </h1>
          <p className="text-gray-400">
            Lamentamos que você queira cancelar sua assinatura
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações da Assinatura */}
          <Card className="glass-card neon-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Sua Assinatura Atual
              </CardTitle>
              <CardDescription className="text-gray-400">
                Detalhes do seu plano atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Status:</span>
                <Badge variant="default">Ativa</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Plano:</span>
                <span className="text-white font-medium">FinanceHub Premium</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Renovação:</span>
                <span className="text-white">Mensal</span>
              </div>
              
              <Separator className="bg-gray-700" />
              
              <div className="space-y-2">
                <h4 className="text-white font-medium">O que você perderá:</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Acesso a relatórios avançados</li>
                  <li>• API para integração</li>
                  <li>• Lembretes e notificações</li>
                  <li>• Suporte prioritário</li>
                  <li>• Backup automático dos dados</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Cancelamento */}
          <Card className="glass-card neon-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Motivo do Cancelamento
              </CardTitle>
              <CardDescription className="text-gray-400">
                Ajude-nos a melhorar nosso serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="text-white font-medium">
                  Principais motivos (opcional):
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {reasonOptions.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setCancellationReason(reason)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                        cancellationReason === reason
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="text-white font-medium">
                  Detalhes adicionais:
                </label>
                <Textarea
                  id="reason"
                  placeholder="Conte-nos mais sobre o motivo do cancelamento..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
                />
              </div>

              {!isConfirming ? (
                <Button
                  onClick={() => setIsConfirming(true)}
                  variant="destructive"
                  className="w-full"
                  disabled={!cancellationReason.trim()}
                >
                  Solicitar Cancelamento
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Confirmação Necessária</span>
                    </div>
                    <p className="text-red-300 text-sm">
                      Esta ação cancelará sua assinatura imediatamente. 
                      Você perderá acesso a todos os recursos premium.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsConfirming(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleCancelSubscription}
                      variant="destructive"
                      className="flex-1"
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      {cancelSubscriptionMutation.isPending ? "Processando..." : "Confirmar Cancelamento"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alternativas */}
        <Card className="glass-card border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Antes de cancelar...
            </CardTitle>
            <CardDescription className="text-gray-400">
              Considere estas alternativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Calendar className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <h4 className="text-white font-medium mb-1">Pausar Assinatura</h4>
                <p className="text-gray-300 text-sm">
                  Pause por até 3 meses sem perder seus dados
                </p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <CreditCard className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <h4 className="text-white font-medium mb-1">Alterar Plano</h4>
                <p className="text-gray-300 text-sm">
                  Mude para um plano mais adequado
                </p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <MessageSquare className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <h4 className="text-white font-medium mb-1">Falar Conosco</h4>
                <p className="text-gray-300 text-sm">
                  Nossa equipe pode ajudar com suas dúvidas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}