/**
 * Core data types for the LM Studio Chat plugin.
 *
 * These are shared across the view, store, and API client.
 * Keep this file small — it's the single source of truth for shapes.
 */

/** One message bubble in a thread. */
export interface Message {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number; // Date.now()
}

/** One conversation thread. */
export interface Thread {
	id: string;
	name: string;
	messages: Message[];
	createdAt: number;
	updatedAt: number;
}

/**
 * The full persisted state.
 * Obsidian stores this as JSON in data.json inside the plugin folder.
 */
export interface ChatStore {
	threads: Thread[];
	activeThreadId: string | null;
}

/** Shape of the OpenAI-compatible chat-completion request body. */
export interface ChatCompletionRequest {
	model: string;
	messages: ChatCompletionMessage[];
	temperature?: number;
	stream?: boolean;
}

/** A single message in the OpenAI chat-completion format. */
export interface ChatCompletionMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** Shape of the non-streaming response from LM Studio. */
export interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: ChatCompletionChoice[];
}

export interface ChatCompletionChoice {
	index: number;
	message: ChatCompletionMessage;
	finish_reason: string;
}

/** Creates a fresh empty thread with a unique ID. */
export function createThread(id?: string): Thread {
	return {
		id: id ?? crypto.randomUUID(),
		name: 'New chat',
		messages: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

/** Creates a user message. */
export function createUserMessage(content: string): Message {
	return { role: 'user', content, timestamp: Date.now() };
}

/** Creates an assistant message. */
export function createAssistantMessage(content: string): Message {
	return { role: 'assistant', content, timestamp: Date.now() };
}
