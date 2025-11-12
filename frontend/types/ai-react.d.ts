declare module "ai/react" {
  // Minimal type stub to satisfy TypeScript in this project
  export interface UseChatOptions {
    api?: string;
    body?: Record<string, any>;
  }
  export interface ChatMessage {
    id: string;
    role: string;
    content: string;
  }
  export function useChat(options?: UseChatOptions): {
    messages: ChatMessage[];
    input: string;
    handleInputChange: (e: any) => void;
    handleSubmit: (e: any) => void;
    isLoading: boolean;
  };
}
