import { Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	LMStudioChatSettings,
	LMStudioChatSettingTab,
} from './settings';

export default class LMStudioChatPlugin extends Plugin {
	settings!: LMStudioChatSettings;

	async onload() {
		// Load persisted settings (falls back to DEFAULT_SETTINGS on first run)
		await this.loadSettings();

		// Register the settings tab under Settings > Community plugins
		this.addSettingTab(new LMStudioChatSettingTab(this.app, this));

		// Quick smoke-test command. Proves the plugin loaded & can talk to us.
		// We'll remove this once the chat panel is wired up.
		this.addCommand({
			id: 'lmstudio-chat-hello',
			name: 'Hello (smoke test)',
			callback: () => {
				new Notice(
					`LM Studio Chat loaded. Endpoint: ${this.settings.apiBaseUrl}:${this.settings.apiPort}`,
				);
			},
		});

		console.log('LM Studio Chat plugin loaded');
	}

	onunload() {
		console.log('LM Studio Chat plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<LMStudioChatSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
