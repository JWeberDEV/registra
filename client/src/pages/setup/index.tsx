import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { CheckCircle, Database, User, Settings, Shield } from 'lucide-react';

const steps = [
  {
    title: 'Conexão com Banco de Dados',
    icon: <Database className="h-6 w-6 text-blue-600" />,
  },
  {
    title: 'Usuário Administrador',
    icon: <User className="h-6 w-6 text-blue-600" />,
  },
  {
    title: 'Confirmação',
    icon: <Shield className="h-6 w-6 text-blue-600" />,
  },
  {
    title: 'Conclusão',
    icon: <CheckCircle className="h-6 w-6 text-green-600" />,
  },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [dbUrl, setDbUrl] = useState('');
  const [adminName, setAdminName] = useState('Administrador');
  const [adminEmail, setAdminEmail] = useState('teste@teste.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);

  // Substituir testConnection por saveDbUrl
  const saveDbUrl = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/setup/save-db-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseUrl: dbUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setCurrentStep(2);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (err) {
      setError('Erro de rede ou servidor');
    }
    setLoading(false);
  };

  // Função para criar admin no passo 2
  const createAdmin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName, adminEmail, adminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setCurrentStep(3);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (err) {
      setError('Erro de rede ou servidor');
    }
    setLoading(false);
  };

  // Função para finalizar setup no passo 3
  const finishSetup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/setup/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setApiToken(data.apiToken || null);
        setCurrentStep(4);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (err) {
      setError('Erro de rede ou servidor');
    }
      setLoading(false);
  };

  const runSetup = async () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      setSuccess('Setup concluído com sucesso!');
      setCurrentStep(4);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold tracking-tight">Setup Wizard</CardTitle>
          </div>
          <div className="flex justify-center gap-4 mb-2">
            {steps.map((step, idx) => (
              <div key={step.title} className="flex flex-col items-center">
                <div className={`rounded-full p-2 border-2 ${currentStep === idx + 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'} transition-all`}>{step.icon}</div>
                <span className={`text-xs mt-1 ${currentStep === idx + 1 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="w-full h-2" />
        </CardHeader>
        <CardContent className="py-6 px-2 md:px-8">
          {currentStep === 1 && (
            <form className="space-y-6" onSubmit={e => { e.preventDefault(); saveDbUrl(); }}>
              <div>
                <Label htmlFor="dbUrl">URL do Banco de Dados</Label>
                <Input
                  id="dbUrl"
                  type="text"
                  placeholder="postgresql://usuario:senha@host:porta/banco"
                  value={dbUrl}
                  onChange={e => setDbUrl(e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Exemplo: postgresql://usuario:senha@localhost:5432/financeiro</p>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {success && <Alert className="border-green-200 bg-green-50"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={loading || !dbUrl}>
                {loading ? 'Testando conexão...' : 'Testar e Salvar Conexão'}
              </Button>
            </form>
          )}
          {currentStep === 2 && (
            <form className="space-y-6" onSubmit={e => { e.preventDefault(); createAdmin(); }}>
              <div>
                <Label htmlFor="adminName">Nome do Administrador</Label>
                <Input
                  id="adminName"
                  type="text"
                  placeholder="Nome completo"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@exemplo.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminPassword">Senha</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Senha segura"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {success && <Alert className="border-green-200 bg-green-50"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Salvando...' : 'Próximo'}
                </Button>
              </div>
            </form>
          )}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>O setup irá:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Criar todas as tabelas necessárias</li>
                    <li>• Criar usuário superadmin: <span className="font-mono">{adminEmail}</span></li>
                    <li>• Criar carteira padrão</li>
                    <li>• Inserir categorias globais (Alimentação, Transporte, etc.)</li>
                    <li>• Inserir formas de pagamento (PIX, Cartão, Dinheiro)</li>
                    <li>• Gerar token API</li>
                  </ul>
                </AlertDescription>
              </Alert>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {success && <Alert className="border-green-200 bg-green-50"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCurrentStep(2)}>
                  Voltar
                </Button>
                <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={finishSetup} disabled={loading}>
                  {loading ? 'Executando Setup...' : 'Executar Setup'}
                </Button>
              </div>
            </div>
          )}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-green-700">Setup Concluído!</h2>
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p><strong>Sistema configurado com sucesso!</strong></p>
                    <p>Você pode agora fazer login com as credenciais do administrador.</p>
                    <p className="text-sm">
                      <strong>Email:</strong> {adminEmail}<br/>
                      <strong>Senha:</strong> {adminPassword}
                    </p>
                    {apiToken && (
                      <p className="text-sm mt-2"><strong>Token API:</strong> <span className="font-mono">{apiToken}</span></p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => window.location.href = '/login'} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Ir para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 