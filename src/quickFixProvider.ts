import * as vscode from 'vscode';
import { OpenAI } from 'openai';

export class QuickFixProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    private async queryChatGPT(prompt: string, apiKey: string, model: string): Promise<string> {
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
            return `Error: ${error.message}`;
        }
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): Thenable<vscode.CodeAction[]> {
        const diagnostics = context.diagnostics;

        const quickFixPromises = diagnostics.map(diagnostic => {
            const fix = new vscode.CodeAction('Fix this issue with OpenAI', vscode.CodeActionKind.QuickFix);
            fix.diagnostics = [diagnostic];
            fix.edit = new vscode.WorkspaceEdit();

            return this.getReplacementCode(document, diagnostic.range, diagnostic.message).then(replacement => {
                fix.edit.replace(document.uri, diagnostic.range, replacement);
                return fix;
            }).catch(error => {
                console.error('Error in getReplacementCode:', error);
                return null;
            });
        });

        return Promise.all(quickFixPromises).then(actions => actions.filter(action => action !== null));
    }

    private async getReplacementCode(document: vscode.TextDocument, range: vscode.Range, diagnosticMessage: string): Promise<string> {
        const codeToFix = document.getText(range);
        const prompt = `Provide a better version of the following code:\n\n${codeToFix}\n\nThe issue is: ${diagnosticMessage}`;
        const apiKey = '';
        const model = 'gpt-3.5-turbo';  // Replace with the model you want to use

        return await this.queryChatGPT(prompt, apiKey, model);
    }
}
