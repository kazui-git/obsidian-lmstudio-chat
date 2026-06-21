/**
 * Chat panel view — the right-sidebar UI for LM Studio Chat.
 *
 * Extends Obsidian's ItemView to render a chat interface with:
 *   - Toolbar (new thread, thread selector, delete)
 *   - Scrollable message list
 *   - Input box + send button
 *
 * Delegates data operations to ChatStoreManager and API calls to
 * the LM Studio client.
 */

import { App, ItemView, Menu, WorkspaceLeaf, Notice } from 'obsidian';
import { LMStudioChatSettings } from './settings';
import { ChatStoreManager } from './store';
import { sendChatRequest } from './lmstudio-client';
import { Thread } from './types';

/** Unique view type ID — registered in main.ts and used by Obsidian internally. */
export const VIEW_TYPE_LMSTUDIO_CHAT = 'lmstudio-chat-view';

export class LMStudioChatView extends ItemView {
	private store: ChatStoreManager;
	private settings: LMStudioChatSettings;

	// DOM references (set in onOpen, cleared in onClose)
	private messageContainer!: HTMLElement;
	private inputEl!: HTMLTextAreaElement;
	private conversationsBtn!: HTMLButtonElement;
	private sendButton!: HTMLButtonElement;
	private isSending = false;

	// Scroll container reference for auto-scroll
	private messagesWrapper!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		store: ChatStoreManager,
		settings: LMStudioChatSettings,
	) {
		super(leaf);
		this.store = store;
		this.settings = settings;
	}

	// ── View lifecycle ──────────────────────────────────────────

	getViewType(): string {
		return VIEW_TYPE_LMSTUDIO_CHAT;
	}

	getDisplayText(): string {
		return 'LM Studio Chat';
	}

	getIcon(): string {
		return 'message-square';
	}

	async onOpen() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.classList.add('lmstudio-chat-plugin');

		// Build the UI structure
		this.buildToolbar(containerEl);
		this.buildMessageArea(containerEl);
		this.buildInputArea(containerEl);

		// Render the current state
		this.renderThreadSelector();
		this.renderMessages();

		// If no threads exist, create one automatically
		if (this.store.threads.length === 0) {
			this.store.createThread();
			this.renderThreadSelector();
		}
	}

	async onClose() {
		// Obsidian handles DOM cleanup for ItemView containers.
		// Nothing extra to clean up — no intervals or global listeners.
	}

	// ── UI Construction ────────────────────────────────────────

	private buildToolbar(container: HTMLElement): void {
		const toolbar = container.createDiv({ cls: 'lmstudio-chat-toolbar' });

		// "New Thread" button
		const newBtn = toolbar.createEl('button', {
			cls: 'lmstudio-chat-toolbar-btn',
			text: '+ New',
		});
		newBtn.addEventListener('click', () => this.handleNewThread());

		// "Conversations" dropdown button — opens Obsidian's Menu
		this.conversationsBtn = toolbar.createEl('button', {
			cls: 'lmstudio-chat-toolbar-btn lmstudio-chat-toolbar-btn-conversations',
		});
		this.conversationsBtn.addEventListener('click', (evt) =>
			this.openConversationsMenu(evt),
		);

		// Spacer pushes Delete to the right side
		toolbar.createDiv({ cls: 'lmstudio-chat-toolbar-spacer' });

		// "Delete Thread" button
		const deleteBtn = toolbar.createEl('button', {
			cls: 'lmstudio-chat-toolbar-btn lmstudio-chat-toolbar-btn-danger',
			text: 'Delete',
		});
		deleteBtn.addEventListener('click', () => this.handleDeleteThread());
	}

	private buildMessageArea(container: HTMLElement): void {
		this.messagesWrapper = container.createDiv({
			cls: 'lmstudio-chat-messages-wrapper',
		});
		this.messageContainer = this.messagesWrapper.createDiv({
			cls: 'lmstudio-chat-messages',
		});
	}

	private buildInputArea(container: HTMLElement): void {
		const inputArea = container.createDiv({ cls: 'lmstudio-chat-input-area' });

		this.inputEl = inputArea.createEl('textarea', {
			cls: 'lmstudio-chat-input',
			attr: {
				placeholder: 'Type a message…',
				rows: '1',
			},
		});

		// Shift+Enter for newline, Enter to send
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.handleSend();
			}
		});

		// Auto-resize textarea height based on content
		this.inputEl.addEventListener('input', () => {
			this.inputEl.style.height = 'auto';
			this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 150) + 'px';
		});

		this.sendButton = inputArea.createEl('button', {
			cls: 'lmstudio-chat-send-btn',
			text: 'Send',
		});
		this.sendButton.addEventListener('click', () => this.handleSend());
	}

	// ── Rendering ──────────────────────────────────────────────

	private renderThreadSelector(): void {
		// Update the Conversations button label to show the active thread name.
		const active = this.store.activeThread;
		this.conversationsBtn.empty();
		this.conversationsBtn.createSpan({
			text: active ? active.name : 'Conversations',
		});
		this.conversationsBtn.createSpan({
			cls: 'lmstudio-chat-toolbar-arrow',
			text: ' ▾',
		});
	}

	/**
	 * Open Obsidian's built-in Menu listing all threads.
	 * The current thread is marked with a check; clicking another switches to it.
	 */
	private openConversationsMenu(evt: MouseEvent): void {
		const menu = new Menu();

		const threads = this.store.threads;
		const activeId = this.store.activeThreadId;

		if (threads.length === 0) {
			menu.addItem((item) => {
				item.setTitle('No conversations').setDisabled(true);
			});
		} else {
			for (const thread of threads) {
				menu.addItem((item) => {
					item.setTitle(thread.name);
					if (thread.id === activeId) {
						item.setChecked(true);
					}
					item.onClick(() => {
						this.store.setActiveThread(thread.id);
						this.renderThreadSelector();
						this.renderMessages();
					});
				});
			}
		}

		menu.showAtMouseEvent(evt);
	}

	private renderMessages(): void {
		const container = this.messageContainer;
		container.empty();

		const thread = this.store.activeThread;
		if (!thread || thread.messages.length === 0) {
			container.createDiv({
				cls: 'lmstudio-chat-empty',
				text: 'Start a conversation…',
			});
			return;
		}

		for (const message of thread.messages) {
			this.appendMessageBubble(container, message);
		}

		// Scroll to the bottom
		requestAnimationFrame(() => {
			this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
		});
	}

	private appendMessageBubble(
		container: HTMLElement,
		message: { role: string; content: string },
	): void {
		const bubble = container.createDiv({
			cls: `lmstudio-chat-message lmstudio-chat-message-${message.role}`,
		});

		// Role label
		bubble.createDiv({
			cls: 'lmstudio-chat-message-role',
			text:
				message.role === 'user'
					? this.settings.userDisplayName || 'You'
					: this.settings.model,
		});

		// Content (support basic line breaks)
		const contentEl = bubble.createDiv({
			cls: 'lmstudio-chat-message-content',
		});
		contentEl.innerHTML = this.escapeHtml(message.content).replace(/\n/g, '<br>');
	}

	private appendLoadingIndicator(): HTMLElement {
		const container = this.messageContainer;
		const loader = container.createDiv({
			cls: 'lmstudio-chat-message lmstudio-chat-message-assistant',
		});
		loader.createDiv({
			cls: 'lmstudio-chat-message-role',
			text: this.settings.model,
		});
		loader.createDiv({
			cls: 'lmstudio-chat-loading',
			text: 'Thinking…',
		});
		this.scrollToBottom();
		return loader;
	}

	// ── Actions ─────────────────────────────────────────────────

	private async handleSend(): Promise<void> {
		const content = this.inputEl.value.trim();
		if (!content || this.isSending) return;

		// Ensure we have an active thread
		if (!this.store.activeThread) {
			this.store.createThread();
			this.renderThreadSelector();
		}

		// Add user message
		this.store.addUserMessage(content);
		this.inputEl.value = '';
		this.inputEl.style.height = 'auto';
		this.renderMessages();

		// Show loading state
		this.isSending = true;
		this.sendButton.disabled = true;
		this.sendButton.textContent = '…';
		const loader = this.appendLoadingIndicator();

		try {
			const thread = this.store.activeThread!;
			const responseText = await sendChatRequest(
				thread.messages,
				this.settings,
			);

			// Remove loading indicator
			loader.remove();

			// Add assistant response
			this.store.addAssistantMessage(responseText);
			this.renderMessages();
		} catch (error) {
			loader.remove();
			const errorMsg =
				error instanceof Error ? error.message : 'Unknown error';
			new Notice(`LM Studio Chat: ${errorMsg}`);

			// Show error as a system-style message in the chat
			const container = this.messageContainer;
			const errBubble = container.createDiv({
				cls: 'lmstudio-chat-message lmstudio-chat-message-error',
			});
			errBubble.createDiv({
				cls: 'lmstudio-chat-message-role',
				text: 'Error',
			});
			errBubble.createDiv({
				cls: 'lmstudio-chat-message-content',
				text: errorMsg,
			});
		} finally {
			this.isSending = false;
			this.sendButton.disabled = false;
			this.sendButton.textContent = 'Send';
		}
	}

	private handleNewThread(): void {
		this.store.createThread();
		this.renderThreadSelector();
		this.renderMessages();
	}

	private handleDeleteThread(): void {
		const id = this.store.activeThreadId;
		if (!id) return;

		this.store.deleteThread(id);
		this.renderThreadSelector();
		this.renderMessages();

		// If all threads were deleted, create a fresh one
		if (this.store.threads.length === 0) {
			this.store.createThread();
			this.renderThreadSelector();
		}
	}

	// ── Utilities ──────────────────────────────────────────────

	private scrollToBottom(): void {
		requestAnimationFrame(() => {
			this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
		});
	}

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}
