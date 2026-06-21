import { App, PluginSettingTab, Setting } from 'obsidian';
import LMStudioChatPlugin from './main';

/**
 * Persisted plugin settings.
 * Stored in Obsidian's plugin data file (NOT in source control).
 */
export interface LMStudioChatSettings {
	/** Base URL of the LM Studio server, e.g. "http://127.0.0.1" */
	apiBaseUrl: string;
	/** Port the LM Studio server listens on, e.g. 1234 */
	apiPort: number;
	/** Model identifier as LM Studio reports it, e.g. "google/gemma-4-e4b" */
	model: string;
	/** Display name shown on user message bubbles, e.g. "You" */
	userDisplayName: string;
	/** Optional system prompt prepended to every thread */
	systemPrompt: string;
	/** Sampling temperature (0 = deterministic, 1 = creative) */
	temperature: number;
}

export const DEFAULT_SETTINGS: LMStudioChatSettings = {
	apiBaseUrl: 'http://127.0.0.1',
	apiPort: 1234,
	model: 'google/gemma-4-e4b',
	userDisplayName: 'You',
	systemPrompt: 'You are a helpful assistant.',
	temperature: 0.7,
};

export class LMStudioChatSettingTab extends PluginSettingTab {
	plugin: LMStudioChatPlugin;

	constructor(app: App, plugin: LMStudioChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- LM Studio server connection ---
		new Setting(containerEl)
			.setName('LM Studio base URL')
			.setDesc('The host where your LM Studio server is running.')
			.addText((text) =>
				text
					.setPlaceholder('http://127.0.0.1')
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value;
						await this.plugin.savePluginData();
					}),
			);

		new Setting(containerEl)
			.setName('Port')
			.setDesc('Default for LM Studio is 1234.')
			.addText((text) =>
				text
					.setPlaceholder('1234')
					.setValue(String(this.plugin.settings.apiPort))
					.onChange(async (value) => {
						const port = Number(value);
						if (!Number.isNaN(port)) {
							this.plugin.settings.apiPort = port;
							await this.plugin.savePluginData();
						}
					}),
			);

		// --- Model selection ---
		new Setting(containerEl)
			.setName('Model')
			.setDesc('Model identifier as LM Studio reports it.')
			.addText((text) =>
				text
					.setPlaceholder('google/gemma-4-e4b')
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.savePluginData();
					}),
			);

		// --- Behavior ---
		new Setting(containerEl)
			.setName('Your display name')
			.setDesc('Label shown on your message bubbles. Defaults to "You".')
			.addText((text) =>
				text
					.setPlaceholder('You')
					.setValue(this.plugin.settings.userDisplayName)
					.onChange(async (value) => {
						this.plugin.settings.userDisplayName = value;
						await this.plugin.savePluginData();
					}),
			);

		new Setting(containerEl)
			.setName('System prompt')
			.setDesc('Prepended to every new thread.')
			.addTextArea((text) => {
				text
					.setPlaceholder('You are a helpful assistant.')
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.savePluginData();
					});
				text.inputEl.rows = 3;
				text.inputEl.cols = 30;
			});

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('0 = deterministic, 1 = creative. Default 0.7.')
			.addText((text) =>
				text
					.setPlaceholder('0.7')
					.setValue(String(this.plugin.settings.temperature))
					.onChange(async (value) => {
						const temp = Number(value);
						if (!Number.isNaN(temp)) {
							this.plugin.settings.temperature = temp;
							await this.plugin.savePluginData();
						}
					}),
			);
	}
}
