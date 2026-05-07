import { useEffect, useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseUnsavedChangesProps {
  forms: UseFormReturn<any>[];
  onTabChange?: (newTab: string, hasChanges: boolean) => void;
  onSaveCallback?: () => Promise<void> | void;
}

export function useUnsavedChanges({ forms, onTabChange, onSaveCallback }: UseUnsavedChangesProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const initialValues = useRef<Record<string, any>>({});

  // Salvar valores iniciais dos formulários
  useEffect(() => {
    forms.forEach((form, index) => {
      const formValues = form.getValues();
      initialValues.current[index] = JSON.stringify(formValues);
    });
  }, []);

  // Monitorar mudanças nos formulários usando formState.isDirty
  useEffect(() => {
    const checkForChanges = () => {
      const anyFormChanged = forms.some(form => form.formState.isDirty);
      setHasUnsavedChanges(anyFormChanged);
    };

    // Verificar inicialmente
    checkForChanges();

    // Configurar interval para verificar mudanças
    const interval = setInterval(checkForChanges, 500);

    return () => {
      clearInterval(interval);
    };
  }, [forms]);

  // Função para lidar com mudança de aba
  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges) {
      setPendingTab(newTab);
      setShowModal(true);
    } else {
      onTabChange?.(newTab, false);
    }
  };

  // Salvar alterações
  const saveChanges = async () => {
    try {
      if (onSaveCallback) {
        await onSaveCallback();
      }
      
      // Atualizar valores iniciais após salvar e resetar estado dirty
      forms.forEach((form, index) => {
        const currentValues = form.getValues();
        initialValues.current[index] = JSON.stringify(currentValues);
        form.reset(currentValues, { keepDefaultValues: true });
      });
      
      setHasUnsavedChanges(false);
      setShowModal(false);
      
      if (pendingTab) {
        onTabChange?.(pendingTab, false);
        setPendingTab(null);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      // Manter a modal aberta em caso de erro
    }
  };

  // Descartar alterações
  const discardChanges = () => {
    forms.forEach((form, index) => {
      const originalValues = JSON.parse(initialValues.current[index]);
      form.reset(originalValues, { keepDefaultValues: true });
    });
    setHasUnsavedChanges(false);
    setShowModal(false);
    if (pendingTab) {
      onTabChange?.(pendingTab, false);
      setPendingTab(null);
    }
  };

  // Cancelar mudança de aba
  const cancelTabChange = () => {
    setShowModal(false);
    setPendingTab(null);
  };

  return {
    hasUnsavedChanges,
    showModal,
    handleTabChange,
    saveChanges,
    discardChanges,
    cancelTabChange,
  };
}