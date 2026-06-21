/**
 * Thread persistence layer.
 *
 * Reads and writes the ChatStore to Obsidian's plugin data file (data.json).
 * The view calls these methods; the store handles serialization and disk I/O
 * via the plugin's loadData/saveData API.
 *
 * In-memory state is the source of truth. Every mutation also persists to disk.
 */

import {
	ChatStore,
	Thread,
	Message,
	createThread,
	createAssistantMessage,
} from './types';

const DEFAULT_STORE: ChatStore = {
	threads: [],
	activeThreadId: null,
};

export class ChatStoreManager {
	private store: ChatStore;
	private persistFn: () => Promise<void>;

	constructor(
		persistFn: () => Promise<void>,
		initialData?: Partial<ChatStore>,
	) {
		this.persistFn = persistFn;
		this.store = {
			threads: initialData?.threads ?? DEFAULT_STORE.threads,
			activeThreadId: initialData?.activeThreadId ?? DEFAULT_STORE.activeThreadId,
		};
	}

	// ── Getters ───────────────────────────────────────────────

	get threads(): Thread[] {
		return this.store.threads;
	}

	get activeThread(): Thread | null {
		return (
			this.store.threads.find((t) => t.id === this.store.activeThreadId) ??
			null
		);
	}

	get activeThreadId(): string | null {
		return this.store.activeThreadId;
	}

	// ── Thread actions ──────────────────────────────────────────

	/** Create a new empty thread and make it active. */
	createThread(): Thread {
		const thread = createThread();
		this.store.threads.unshift(thread); // newest first
		this.store.activeThreadId = thread.id;
		this.persist();
		return thread;
	}

	/** Switch to an existing thread by ID. */
	setActiveThread(id: string): Thread | null {
		const thread = this.store.threads.find((t) => t.id === id);
		if (thread) {
			this.store.activeThreadId = id;
			this.persist();
		}
		return thread ?? null;
	}

	/** Delete a thread by ID. If it was active, switch to the next one. */
	deleteThread(id: string): void {
		const index = this.store.threads.findIndex((t) => t.id === id);
		if (index === -1) return;

		this.store.threads.splice(index, 1);

		// If we deleted the active thread, pick a new one
		if (this.store.activeThreadId === id) {
			this.store.activeThreadId =
				this.store.threads[0]?.id ?? null;
		}

		this.persist();
	}

	// ── Message actions ────────────────────────────────────────

	/** Add a user message to the active thread. Auto-names the thread on first message. */
	addUserMessage(content: string): Message | null {
		const thread = this.activeThread;
		if (!thread) return null;

		const message: Message = {
			role: 'user',
			content,
			timestamp: Date.now(),
		};

		thread.messages.push(message);
		thread.updatedAt = Date.now();

		// Auto-name the thread from the first user message
		if (thread.name === 'New chat' && content.length > 0) {
			thread.name = content.slice(0, 50) + (content.length > 50 ? '…' : '');
		}

		this.persist();
		return message;
	}

	/** Add an assistant message to the active thread. */
	addAssistantMessage(content: string): Message | null {
		const thread = this.activeThread;
		if (!thread) return null;

		const message = createAssistantMessage(content);

		thread.messages.push(message);
		thread.updatedAt = Date.now();

		this.persist();
		return message;
	}

	// ── Persistence ────────────────────────────────────────────

	private async persist(): Promise<void> {
		await this.persistFn();
	}

	/** Get the raw store (for debugging or serialization). */
	getRaw(): ChatStore {
		return { ...this.store };
	}
}
