import { Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	LMStudioChatSettings,
	LMStudioChatSettingTab,
} from './settings';
import { ChatStoreManager } from './store';
import { LMStudioChatView, VIEW_TYPE_LMSTUDIO_CHAT } from './view';
import { ChatStore } from './types';

/**
 * The single JSON structure persisted by this plugin.
 * Obsidian's loadData/saveData API stores one object per plugin.
 * We namespace our two concerns (settings vs chat data) under separate keys.
 */
interface PluginData {
	settings?: Partial<LMStudioChatSettings>;
	chatStore?: Partial<ChatStore>;
}

export default class LMStudioChatPlugin extends Plugin {
	settings!: LMStudioChatSettings;
	store!: ChatStoreManager;

	async onload() {
		// 1. Load the persisted data blob and split it into settings + chat store
		const data = (await this.loadData()) as PluginData | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);
		this.store = new ChatStoreManager(() => this.savePluginData(), data?.chatStore);

		// 2. Register our sidebar view type with Obsidian
		this.registerView(
			VIEW_TYPE_LMSTUDIO_CHAT,
			(leaf) => new LMStudioChatView(leaf, this.store, this.settings),
		);

		// 3. Add a ribbon icon in the left sidebar to open the chat panel
		this.addRibbonIcon('message-square', 'Open LM Studio Chat', () => {
			this.activateChatView();
		});

		// 4. Add a command so it's also accessible via Command Palette
		this.addCommand({
			id: 'open-lmstudio-chat',
			name: 'Open LM Studio Chat',
			callback: () => {
				this.activateChatView();
			},
		});

		// 5. Register the settings tab
		this.addSettingTab(new LMStudioChatSettingTab(this.app, this));

		console.log('LM Studio Chat plugin loaded');
	}

	onunload() {
		console.log('LM Studio Chat plugin unloaded');
	}

	/**
	 * Persist both settings and chat store in a single saveData call.
	 * Called by the settings tab and the store whenever their data changes.
	 */
	async savePluginData(): Promise<void> {
		const data: PluginData = {
			settings: this.settings,
			chatStore: this.store.getRaw(),
		};
		await this.saveData(data);
	}

	/**
	 * Opens (or activates) the chat view in the right sidebar.
	 */
	async activateChatView(): Promise<void> {
		const { workspace } = this.app;

		// Check if our view is already open somewhere
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_LMSTUDIO_CHAT)[0];

		if (!leaf) {
			// Create a new leaf in the right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) {
				new Notice('Could not open LM Studio Chat panel.');
				return;
			}
			leaf = rightLeaf;
		}

		// Activate the leaf (brings it into focus) and open our view
		await leaf.setViewState({
			type: VIEW_TYPE_LMSTUDIO_CHAT,
			active: true,
		});

		// Reveal the right sidebar in case it's collapsed
		workspace.revealLeaf(leaf);
	}
}
