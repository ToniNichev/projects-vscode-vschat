import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { getWebviewContent } from './webviewContent';
import { marked } from "marked";

async function queryChatGPT(prompt: string, apiKey: string, model: string) {
    const openai = new OpenAI({
        apiKey: apiKey
    });

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: model,
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching completion:', error);
        if (error instanceof Error) {
            return `Error: ${error.message}`;
        } else {
            return 'An unknown error occurred.';
        }
    }
}

// Create a custom renderer
const renderer = new marked.Renderer();

renderer.code = (code, infostring) => {
    const language = infostring ? infostring.toLowerCase() : 'plaintext';
    const languageLabel = infostring ? infostring.charAt(0).toUpperCase() + infostring.slice(1) : 'Plaintext';
    
    return `
        <div class="code-window">
            <div class="code-header">${languageLabel}</div>
            <pre><code class="language-${language}">${code}</code></pre>
        </div>
    `;
};

marked.setOptions({
    renderer,
    breaks: true // Ensure breaks are enabled
});


export function activate(context: vscode.ExtensionContext) {

    let panel: vscode.WebviewPanel | undefined = undefined;

    let disposable = vscode.commands.registerCommand('vschat.chat', async () => {



        const secretStorage = context.secrets;
        let apiKey = await secretStorage.get('openai.apiKey');

        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({ prompt: 'Enter your OpenAI API key', ignoreFocusOut: true, password: true });
            if (apiKey) {
                await secretStorage.store('openai.apiKey', apiKey);
            } else {
                vscode.window.showErrorMessage('API key is required to use this extension.');
                return;
            }
        }



        if (panel) {
            panel.reveal(vscode.ViewColumn.One);
        } else {
            panel = vscode.window.createWebviewPanel(
                'chatPanel',
                'Chat',
                vscode.ViewColumn.One,
                {
                    enableScripts: true // Allow scripts in the webview
                }
            );

            panel.webview.html = getWebviewContent();

            // Restore the previous state
            const previousState = context.globalState.get<string>('chatState');
            if (previousState) {
                panel.webview.postMessage({ command: 'restoreState', state: previousState });
            }

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'sendMessage':
                            const rawResponse = await queryChatGPT(message.text, apiKey, message.model);
                            if (rawResponse === null) {
                                return;
                            }

                            let response = marked(rawResponse);
                            if (panel) {
                                // Send response back to the webview
                                panel.webview.postMessage({ command: 'receiveMessage', text: response });
                                // vscode.window.showInformationMessage('Received message: ' + response);
                                // Update state
                                panel.webview.postMessage({ command: 'updateState' });
                            }
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.onDidDispose(() => {
                panel = undefined;
            }, null, context.subscriptions);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }