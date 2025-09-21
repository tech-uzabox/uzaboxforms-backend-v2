import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  LanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ChatModel as AIChatModel } from './types/ai.types';

export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export const chatModels: Array<AIChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
];

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openrouter('google/gemini-2.5-flash'),
    'chat-model-reasoning': wrapLanguageModel({
      model: openrouter('google/gemini-2.5-flash'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': openrouter('google/gemini-2.5-flash'),
    'artifact-model': openrouter('google/gemini-2.5-flash'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-3'),
  },
}) as any;
