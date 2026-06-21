/**
 * HTTP client for LM Studio's OpenAI-compatible API.
 *
 * Uses Obsidian's requestUrl() instead of the browser's fetch() because
 * fetch() is subject to CORS restrictions in the Electron renderer, which
 * blocks requests to the local LM Studio server. requestUrl() runs in the
 * Electron main process and bypasses CORS — this is the canonical way for
 * Obsidian plugins to make HTTP requests.
 *
 * LM Studio exposes /v1/chat/completions with the same shape as OpenAI.
 * In v2 (tool-use) this file gains streaming support + function-calling,
 * but the view doesn't need to change — it just calls sendMessage().
 */

import { requestUrl } from 'obsidian';
import {
	ChatCompletionRequest,
	ChatCompletionMessage,
	Message,
} from './types';
import { LMStudioChatSettings } from './settings';

/** Send messages to LM Studio and return the assistant's response text. */
export async function sendChatRequest(
	messages: Message[],
	settings: LMStudioChatSettings,
): Promise<string> {
	const { apiBaseUrl, apiPort, model, systemPrompt, temperature } = settings;

	// Build the URL: http://127.0.0.1:1234/v1/chat/completions
	const url = `${apiBaseUrl}:${apiPort}/v1/chat/completions`;

	// Convert our Message[] into OpenAI format, prepending the system prompt
	const apiMessages: ChatCompletionMessage[] = [
		{ role: 'system', content: systemPrompt },
		...messages.map((m) => ({
			role: m.role as 'user' | 'assistant',
			content: m.content,
		})),
	];

	const body: ChatCompletionRequest = {
		model,
		messages: apiMessages,
		temperature,
		stream: false,
	};

	try {
		const response = await requestUrl({
			url,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			// requestUrl throws on non-2xx by default; we handle errors ourselves
			throw: false,
		});

		if (response.status >= 400) {
			const errorText =
				typeof response.text === 'string' ? response.text : '';
			throw new Error(
				`LM Studio returned ${response.status}: ${errorText}`,
			);
		}

		// The response shape: { choices: [{ message: { content: "..." } }] }
		const content = response.json?.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error('LM Studio returned an empty response.');
		}

		return content;
	} catch (error) {
		if (error instanceof Error) {
			// Re-throw with a user-friendly prefix for common failure modes
			if (
				error.message.includes('Failed to fetch') ||
				error.message.includes('ECONNREFUSED') ||
				error.message.toLowerCase().includes('tunneling')
			) {
				throw new Error(
					'Cannot connect to LM Studio. Make sure the server is running ' +
						`at ${apiBaseUrl}:${apiPort}.`,
				);
			}
			throw error;
		}
		throw new Error(
			'An unknown error occurred while contacting LM Studio.',
		);
	}
}
