import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Tenta analisar como JSON primeiro
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await res.clone().json();
        console.error(`API Error (${res.status}):`, jsonData);
        throw jsonData;
      } else {
        const text = await res.text();
        console.error(`API Error (${res.status}):`, text || res.statusText);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Se não conseguir analisar como JSON, usa o texto
        const text = await res.text();
        console.error(`API Error (${res.status}):`, text || res.statusText);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      throw error;
    }
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: {
    method: string;
    data?: any;
  } = { method: 'GET' }
): Promise<T> {
  console.log(`API Request: ${options.method} ${url}`, options.data);
  
  const res = await fetch(url, {
    method: options.method,
    headers: options.data ? { "Content-Type": "application/json" } : {},
    body: options.data ? JSON.stringify(options.data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  if (options.method === "DELETE") {
    return true as unknown as T;
  }
  
  const responseData = await res.json().catch(() => ({})) as T;
  console.log(`API Response:`, responseData);
  return responseData;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
