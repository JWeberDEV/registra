import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Activity, Database } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalWallets: number;
  systemHealth: string;
}

export default function AdminStatsWidget() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <Card className="glass-card neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estatísticas Administrativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Carregando estatísticas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estatísticas Administrativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <div className="text-sm text-gray-400">Total de Usuários</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
            <div className="text-sm text-gray-400">Usuários Ativos</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Database className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
            <div className="text-sm text-gray-400">Total Transações</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">
              {stats?.systemHealth || "OK"}
            </div>
            <div className="text-sm text-gray-400">Status do Sistema</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}