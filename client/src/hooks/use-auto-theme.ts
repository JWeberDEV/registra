import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { themeManager } from '@/utils/theme-manager';

// Função para normalizar dados de tema vindos do banco
const normalizeThemeData = (theme: any) => {
  const normalizedTheme = {
    id: theme.id,
    name: theme.name,
    lightConfig: theme.lightConfig || theme.lightconfig,
    darkConfig: theme.darkConfig || theme.darkconfig,
    isDefault: theme.isDefault || theme.isdefault,
    isActiveLight: theme.isActiveLight || theme.isactivelight,
    isActiveDark: theme.isActiveDark || theme.isactivedark,
    createdAt: theme.createdAt || theme.createdat,
    updatedAt: theme.updatedAt || theme.updatedat
  };

  // Parse strings JSON se necessário
  if (typeof normalizedTheme.lightConfig === 'string') {
    try {
      normalizedTheme.lightConfig = JSON.parse(normalizedTheme.lightConfig);
    } catch (error) {
      console.error('Erro ao fazer parse de lightConfig:', error);
    }
  }

  if (typeof normalizedTheme.darkConfig === 'string') {
    try {
      normalizedTheme.darkConfig = JSON.parse(normalizedTheme.darkConfig);
    } catch (error) {
      console.error('Erro ao fazer parse de darkConfig:', error);
    }
  }

  return normalizedTheme;
};

export function useAutoTheme() {
  const { theme: currentMode } = useTheme();
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [themeLoadError, setThemeLoadError] = useState<string | null>(null);

  // Aplicar tema CRÍTICO IMEDIATAMENTE no primeiro render (antes de qualquer fetch)
  useEffect(() => {
    console.log('⚡ Aplicando tema CRÍTICO IMEDIATO para evitar flash...');
    const immediateMode = (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    themeManager.applyCriticalTheme(immediateMode);
  }, []); // Executar IMEDIATAMENTE

  useEffect(() => {
    // Função para carregar e aplicar tema ativo automaticamente
    const loadActiveTheme = async () => {
      try {
        if (!currentMode || currentMode === 'system') return;
        
        setThemeLoadError(null);
        const mode = currentMode as 'light' | 'dark';
        
        console.log(`🔄 Carregando tema ativo para ${mode} mode...`);
        
        const response = await fetch(`/api/themes/active/${mode}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          const activeTheme = normalizeThemeData(result.data);
          
          console.log(`🎨 Auto-aplicando tema ativo para ${mode} mode:`, activeTheme.name);
          
          // Aplicar o tema ativo automaticamente
          themeManager.applyTheme(activeTheme, mode, false);
          setIsThemeLoaded(true);
        } else if (response.status === 404) {
          console.log(`No active theme found for ${mode} mode, using default`);
          // Usar tema padrão quando não há tema ativo
          themeManager.resetToDefault(mode);
          setIsThemeLoaded(true);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const errorMessage = `Erro ao carregar tema ativo para ${currentMode} mode: ${error}`;
        console.error(errorMessage);
        setThemeLoadError(errorMessage);
        
        // Fallback para tema padrão em caso de erro
        if (currentMode && currentMode !== 'system') {
          themeManager.resetToDefault(currentMode as 'light' | 'dark');
          setIsThemeLoaded(true);
        }
      }
    };

    // Carregar tema quando o modo mudar ou na inicialização
    if (currentMode && currentMode !== 'system') {
      loadActiveTheme();
    }
  }, [currentMode]);

  // Efeito PRINCIPAL para carregar tema IMEDIATAMENTE na inicialização
  useEffect(() => {
    const loadInitialTheme = async () => {
      try {
        console.log('🚀 Iniciando carregamento IMEDIATO de tema...');
        
        // Detectar o modo IMEDIATAMENTE sem esperar next-themes
        const initialMode = currentMode || 
          (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        if (initialMode !== 'system') {
          const mode = initialMode as 'light' | 'dark';
          
          console.log(`🎨 Carregando tema INICIAL para ${mode} mode (ANTES de qualquer tela)...`);
          
          try {
            // Tentar carregar tema ativo sem autenticação primeiro
            const response = await fetch(`/api/themes/active/${mode}`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const result = await response.json();
              const activeTheme = normalizeThemeData(result.data);
              
              console.log(`✅ SUCESSO: Aplicando tema inicial para ${mode} mode:`, activeTheme.name);
              
              // Aplicar o tema ativo IMEDIATAMENTE
              themeManager.applyTheme(activeTheme, mode, false);
              setIsThemeLoaded(true);
              return;
            } else if (response.status === 401) {
              console.log(`🔒 Não autenticado, tentando endpoint público para ${mode} mode...`);
              // Se não autenticado, tentar endpoint público ou fallback
            } else if (response.status === 404) {
              console.log(`❌ Nenhum tema ativo encontrado para ${mode} mode`);
            }
          } catch (fetchError) {
            console.log(`⚠️ Erro na requisição, usando fallback:`, fetchError);
          }
          
          // FALLBACK: Sempre aplicar tema padrão se não conseguir carregar
          console.log(`🎨 Aplicando tema PADRÃO para ${mode} mode...`);
          themeManager.resetToDefault(mode);
          setIsThemeLoaded(true);
        }
      } catch (error) {
        console.error('💥 Erro CRÍTICO ao carregar tema inicial:', error);
        setThemeLoadError(`Erro crítico: ${error}`);
        
        // FALLBACK CRÍTICO: Sempre aplicar um tema
        const fallbackMode = currentMode || 
          (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        if (fallbackMode !== 'system') {
          console.log(`🆘 FALLBACK CRÍTICO: Aplicando tema padrão para ${fallbackMode} mode`);
          themeManager.resetToDefault(fallbackMode as 'light' | 'dark');
          setIsThemeLoaded(true);
        }
      }
    };

    // EXECUTAR IMEDIATAMENTE - sem esperar nada
    loadInitialTheme();
  }, []); // Array vazio para executar APENAS uma vez na montagem IMEDIATA

  return {
    currentMode: currentMode as 'light' | 'dark' | 'system',
    isThemeLoaded,
    themeLoadError
  };
}