import { CoreAssistantMessage, UIMessage } from 'ai';

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<CoreAssistantMessage & { id?: string }>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage?.id ?? null;
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}
