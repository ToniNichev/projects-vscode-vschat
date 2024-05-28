import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { getWebviewContent } from './webviewContent';

async function queryChatGPT(prompt: string, apiKey: string) {
    const openai = new OpenAI({
        apiKey: apiKey
    });

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "gpt-3.5-turbo",
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching completion:', error);
        return `Error: ${error.message}`;
    }
}

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
                            const rawResponse = await queryChatGPT(message.text, apiKey);
                            if(rawResponse === null) {
                                return;
                            }
                            let response = rawResponse.replace(/\n/g, '<br>');
                            response =  response.replace(/```(.*?)<br>(.*?)```/gs, `
                            <div class="mx-auto">
                            <div class="bg-gray-800 rounded-lg shadow-lg">
                                <div class="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-t-lg">
                                    <span class="text-green-500 text-sm font-mono">$1</span>
                                    <div class="space-x-1.5">
                                    <span class="block w-2 h-2 bg-red-500 rounded-full"></span>
                                    <span class="block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                    <span class="block w-2 h-2 bg-green-500 rounded-full"></span>
                                </div>                    
                                </div>
                                <pre class="p-4 overflow-auto text-sm bg-gray-800 rounded-b-lg text-white font-mono">
                                <pre><code class="language-javascript">$2</code></pre>
                            </div>
                        </div>                            
                            `);
                            // Send response back to the webview
                            panel.webview.postMessage({ command: 'receiveMessage', text: response });
                            vscode.window.showInformationMessage('Received message: ' + response);
                            // Update state
                            panel.webview.postMessage({ command: 'updateState' });
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