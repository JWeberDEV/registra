import { useAuth } from "@/hooks/use-auth";

export function useSubscriptionStatus() {
  const { user } = useAuth();

  const isSubscriptionExpired = (): boolean => {
    if (!user) return false;
    
    // Check if user has expiration date and it's in the past
    if (user.data_expiracao_assinatura) {
      const expirationDate = new Date(user.data_expiracao_assinatura);
      const now = new Date();
      return expirationDate <= now;
    }

    // Check if user is canceled without expiration date (legacy cases)
    if (user.data_cancelamento && !user.data_expiracao_assinatura) {
      return true;
    }

    return false;
  };

  const hasActiveAccess = (): boolean => {
    if (!user) return false;
    
    // If not canceled, has access
    if (!user.data_cancelamento) return true;
    
    // If canceled but not expired yet, has access
    if (user.data_expiracao_assinatura) {
      const expirationDate = new Date(user.data_expiracao_assinatura);
      const now = new Date();
      return expirationDate > now;
    }

    // If canceled without expiration date, no access
    return false;
  };

  return {
    user,
    isSubscriptionExpired: isSubscriptionExpired(),
    hasActiveAccess: hasActiveAccess(),
    expirationDate: user?.data_expiracao_assinatura
  };
}