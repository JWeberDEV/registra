import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Shield,
  UserCog,
  Activity,
  Database,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  UserX,
  AlertTriangle
} from "lucide-react";
import { User } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as PieChartComponent, Cell, BarChart, Bar, Pie } from 'recharts';
import { useTheme } from "next-themes";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  canceledUsers: number;
  inactiveUsers: number;
  totalTransactions: number;
  totalWallets: number;
  totalCancelamentos: number;
  systemHealth: string;
}

interface UserWithStats extends User {
  transactionCount: number;
  lastAccess: string | null;
}

interface AnalyticsData {
  userGrowth: Array<{ month: string; users: number; activeUsers: number }>;
  transactionVolume: Array<{ month: string; transactions: number; volume: number }>;
  userStatusDistribution: Array<{ name: string; count: number; color: string }>;
  walletDistribution: Array<{ range: string; count: number }>;
  recentActivity: Array<{ date: string; users: number; transactions: number }>;
  monthlyTransactionTrends: Array<{ month: string; income: number; expenses: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminDashboard() {
  const { theme } = useTheme();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const { toast } = useToast();

  // Buscar estatísticas do sistema
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: true
  });

  // Buscar lista de usuários
  const { data: users, isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
    enabled: true
  });

  // Buscar dados analíticos reais do banco de dados
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: true
  });

  // Buscar usuários recentes
  const { data: recentUsers, isLoading: recentUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/recent-users"],
    enabled: true
  });

  // Debug log para verificar os dados dos usuários recentes
  console.log('Recent Users Debug:', {
    recentUsers,
    recentUsersLoading,
    hasData: !!recentUsers,
    dataLength: recentUsers?.length
  });

  const handleImpersonate = async (userId: number, userName: string) => {
    try {
      setSelectedAction(`impersonate-${userId}`);
      
      console.log(`Iniciando personificação do usuário: ${userName} (ID: ${userId})`);
      
      toast({
        title: "Processando",
        description: `Iniciando personificação do usuário ${userName}...`,
      });
      
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: userId })
      });

      console.log(`Resposta da API - Status: ${response.status}`);

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Personificação do usuário ${userName} realizada com sucesso. Redirecionando...`,
        });
        
        // Aguardar um pouco para mostrar o toast antes de redirecionar
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        const error = await response.json();
        console.error('Erro na personificação:', error);
        
        toast({
          title: "Erro na Personificação",
          description: error.error || 'Não foi possível personificar o usuário.',
          variant: "destructive",
        });
        
        setErrorModal({
          isOpen: true,
          title: 'Erro na Personificação',
          message: error.error || 'Ocorreu um erro ao tentar personificar o usuário.'
        });
      }
    } catch (error) {
      console.error('Erro na personificação:', error);
      
      toast({
        title: "Erro Inesperado",
        description: 'Ocorreu um erro de conexão. Tente novamente.',
        variant: "destructive",
      });
      
      setErrorModal({
        isOpen: true,
        title: 'Erro na Personificação',
        message: 'Ocorreu um erro inesperado ao tentar personificar o usuário.'
      });
    } finally {
      setSelectedAction(null);
    }
  };

  const handleEndImpersonation = async () => {
    try {
      setSelectedAction('end-impersonation');
      
      const response = await fetch("/api/admin/end-impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (response.ok) {
        // Recarregar a página para aplicar o fim da personificação
        window.location.href = "/admin/dashboard";
      } else {
        const error = await response.json();
        console.error('Erro ao finalizar personificação:', error);
      }
    } catch (error) {
      console.error('Erro ao finalizar personificação:', error);
    } finally {
      setSelectedAction(null);
    }
  };


  const getUserStatusBadge = (user: User) => {
    // Seguindo as regras definidas em REGRASUSUARIO.md
    if (user.data_cancelamento) {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    if (!user.ativo) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const formatLastAccess = (date: string | Date | null) => {
    if (!date) return "Nunca";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (statsLoading || analyticsLoading || !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse glass-card">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-600 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold mb-2 flex items-center gap-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}> 
          <Shield className="h-8 w-8 text-purple-500" />
          Dashboard SaaS - FinanceHub
        </h1>
        <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Visão geral administrativa da plataforma</p>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.totalUsers || 0}</div>
            <p className="text-xs text-green-400 mt-1">
              +{Math.round(((stats?.totalUsers || 0) / 5) * 100)}% crescimento
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Usuários Ativos</CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.activeUsers || 0}</div>
            <p className="text-xs text-green-400 mt-1">
              {Math.round(((stats?.activeUsers || 0) / (stats?.totalUsers || 1)) * 100)}% taxa de ativação
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Transações</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.totalTransactions || 0}</div>
            <p className="text-xs text-yellow-400 mt-1">
              Média: {Math.round((stats?.totalTransactions || 0) / (stats?.activeUsers || 1))} por usuário
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Usuários Cancelados</CardTitle>
            <UserX className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.canceledUsers || 0}</div>
            <p className="text-xs text-red-400 mt-1">
              {Math.round(((stats?.canceledUsers || 0) / (stats?.totalUsers || 1)) * 100)}% da base
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Usuários Inativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.inactiveUsers || 0}</div>
            <p className="text-xs text-orange-400 mt-1">
              {Math.round(((stats?.inactiveUsers || 0) / (stats?.totalUsers || 1)) * 100)}% inativos
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} text-sm font-medium`}>Carteiras</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats?.totalWallets || 0}</div>
            <p className="text-xs text-purple-400 mt-1">
              {Math.round(((stats?.totalWallets || 0) / (stats?.totalUsers || 1)) * 100)}% com carteiras
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Gráficos de Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento de Usuários */}
        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader>
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
              <BarChart3 className="h-5 w-5" />
              Crescimento de Usuários
            </CardTitle>
            <CardDescription className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Evolução mensal da base de usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="activeUsers" stroke="#10B981" strokeWidth={2} name="Ativos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume de Transações */}
        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader>
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
              <TrendingUp className="h-5 w-5" />
              Volume de Transações
            </CardTitle>
            <CardDescription className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Evolução mensal do volume transacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.transactionVolume || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="transactions" fill="#F59E0B" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Status de Usuários */}
        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader>
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
              <PieChart className="h-5 w-5" />
              Distribuição de Usuários
            </CardTitle>
            <CardDescription className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Por status conforme regras de negócio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChartComponent>
                <Pie
                  data={analyticsData?.userStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analyticsData?.userStatusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChartComponent>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
          <CardHeader>
            <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
              <Activity className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Últimos 7 dias de atividade do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData?.recentActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2} name="Usuários Ativos" />
                <Line type="monotone" dataKey="transactions" stroke="#F59E0B" strokeWidth={2} name="Transações" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários Recentes */}
      <Card className={`glass-card neon-border ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}>
        <CardHeader>
          <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
            <UserCog className="h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Últimos usuários cadastrados e ações administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent">Usuários Recentes</TabsTrigger>
              <TabsTrigger value="distribution">Distribuição de Carteiras</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="mt-6">
              <div className="overflow-x-auto">
                {recentUsersLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full bg-gray-700" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className={`text-left py-3 px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Nome</th>
                        <th className={`text-left py-3 px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Email</th>
                        <th className={`text-left py-3 px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Status</th>
                        <th className={`text-left py-3 px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Data Cadastro</th>
                        <th className={`text-left py-3 px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers?.map((user) => (
                        <tr key={user.id} className={`border-b ${theme === 'light' ? 'border-gray-100 hover:bg-primary/10' : 'border-gray-800 hover:bg-gray-800/50'}`}> 
                          <td className={`py-3 px-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{user.nome}</td>
                          <td className={`py-3 px-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{user.email}</td>
                          <td className="py-3 px-2">{getUserStatusBadge(user)}</td>
                          <td className={`py-3 px-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{formatLastAccess(user.data_cadastro)}</td>
                          <td className="py-3 px-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonate(user.id, user.nome)}
                              disabled={selectedAction === `impersonate-${user.id}`}
                              className={`text-xs ${selectedAction === `impersonate-${user.id}` ? 'animate-pulse' : ''}`}
                            >
                              {selectedAction === `impersonate-${user.id}` ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                  Processando...
                                </span>
                              ) : "Impersonificar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="distribution" className="mt-6">
              {/* Cabeçalho explicativo sobre critérios de distribuição */}
              <div className={`mb-6 p-4 rounded-lg border ${theme === 'light' ? 'bg-blue-100 border-blue-200' : 'bg-blue-900/20 border-blue-500/30'}`}>
                <div className="flex items-start gap-3">
                  <Database className={`h-5 w-5 mt-0.5 flex-shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'}`} />
                  <div>
                    <h4 className={`font-semibold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-blue-200'}`}>Critério de Distribuição</h4>
                    <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-gray-700' : 'text-blue-300/80'}`}>
                      As carteiras são distribuídas por faixas de <strong>saldo atual</strong> calculado em tempo real. 
                      O saldo é obtido pela soma de todas as receitas menos todas as despesas da carteira, 
                      incluindo transações pendentes e agendadas.
                    </p>
                    <div className={`mt-3 text-xs ${theme === 'light' ? 'text-gray-500' : 'text-blue-300/60'}`}>
                      <span className="font-medium">Atualização:</span> Os dados são recalculados automaticamente a cada consulta
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards de distribuição melhorados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(analyticsData?.walletDistribution || []).map((range, index) => {
                  const isLoading = analyticsLoading;
                  // Cores iguais para ambos os temas
                  const colors = ['text-green-600', 'text-yellow-600', 'text-red-600'];
                  const bgColors = ['bg-green-100', 'bg-yellow-100', 'bg-red-100'];
                  const borderColors = ['border-green-300', 'border-yellow-300', 'border-red-300'];
                  const darkColors = ['text-green-400', 'text-yellow-400', 'text-red-400'];
                  const darkBgColors = ['bg-green-900/20', 'bg-yellow-900/20', 'bg-red-900/20'];
                  const darkBorderColors = ['border-green-500/30', 'border-yellow-500/30', 'border-red-500/30'];
                  return (
                    <Card key={index} className={
                      theme === 'light'
                        ? `${bgColors[index]} ${borderColors[index]} border`
                        : `${darkBgColors[index]} ${darkBorderColors[index]} border`
                    }>
                      <CardContent className="p-4">
                        <div className="text-center">
                          {isLoading ? (
                            <Skeleton className={`h-8 w-12 mx-auto mb-2 ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}`} />
                          ) : (
                            <div className={`text-2xl font-bold ${theme === 'light' ? colors[index] : darkColors[index]}`}>
                              {range.count}
                            </div>
                          )}
                          <div className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}> 
                            {range.range}
                          </div>
                          <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}> 
                            {index === 0 && "Carteiras com saldo baixo"}
                            {index === 1 && "Carteiras com saldo médio"}
                            {index === 2 && "Carteiras com saldo alto"}
                          </div>
                          {!isLoading && (
                            <div className={`mt-2 text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}> 
                              {((range.count / (analyticsData?.walletDistribution?.reduce((acc, r) => acc + r.count, 0) || 1)) * 100).toFixed(1)}% do total
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Rodapé informativo */}
              <div className={`mt-4 text-xs text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}> 
                <p>
                  Distribuição baseada no saldo atual de cada carteira • 
                  Inclui transações de todos os status • 
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Erro com Efeito Zoom-in Bounce */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay com fade-in */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-300"
            onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
          />
          
          {/* Modal com zoom-in bounce effect */}
          <div 
            className={`relative rounded-xl p-6 max-w-md w-full shadow-2xl ${theme === 'light' ? 'bg-white border border-red-200' : 'bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/50'}`}
            style={{
              animation: 'zoomInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
            }}
          >
            {/* Ícone de erro com efeito pulsante */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 animate-pulse ${theme === 'light' ? 'bg-red-100 border-red-200' : 'bg-red-500/20 border-red-500/30'}`}>
                <AlertTriangle className={`w-8 h-8 ${theme === 'light' ? 'text-red-500' : 'text-red-400'}`} />
              </div>
            </div>
            
            {/* Título centralizado */}
            <h3 className={`text-xl font-bold text-center mb-2 ${theme === 'light' ? 'text-red-600' : 'text-white'}`}>
              {errorModal.title}
            </h3>
            
            {/* Linha decorativa */}
            <div className={`w-16 h-1 bg-red-500 rounded-full mx-auto mb-4`}></div>
            
            {/* Mensagem de erro */}
            <div className={`border rounded-lg p-4 mb-6 ${theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className={`text-center leading-relaxed ${theme === 'light' ? 'text-red-700' : 'text-gray-200'}`}>
                {errorModal.message}
              </p>
            </div>
            
            {/* Botão de fechar */}
            <div className="flex justify-center">
              <Button
                onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-lg ${theme === 'light' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}