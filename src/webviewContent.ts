export function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>

            .message {
                padding: 10px;
                border-radius: 10px;
                margin-bottom: 10px;
                position: relative;
                font-size: 14px;
                color: #333;
                overflow-x: hidden;
            }
            .user-message::before {
                content: '';
                position: absolute;
                top: 10px;
                right: -10px;
                border-width: 5px;
                border-style: solid;
                border-color: transparent transparent transparent #dcf8c6;
            }
            .bot-response::before {
                content: '';
                position: absolute;
                top: 10px;
                left: -10px;
                border-width: 5px;
                border-style: solid;
                border-color: transparent #ececec transparent transparent;
            }
            .user-message {
                background-color: #dcf8c6;
                color: #333;
            }
            .bot-response {
                background-color: #ececec;
                color: #333;
            }
            textarea {
                color: #333;
                width: 100%;
                resize: none;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
                margin-right: 10px;
            }
            button {
                padding: 10px;
                border: none;
                border-radius: 5px;
                background-color: #007acc;
                color: white;
                cursor: pointer;
            }
            button:hover {
                background-color: #005f99;
            }

            .script-snippet {
                background-color: #f7fafc; /* bg-gray-100 */
                border: 1px solid #e2e8f0; /* border-gray-300 */
                border-radius: 0.375rem; /* rounded-md */
                padding: 1rem; /* p-4 */
                margin-top: 1rem; /* my-4 */
                margin-bottom: 1rem; /* my-4 */
                overflow-x: auto; /* overflow-x-auto */
            }
            .code-content {
                font-size: 0.875rem; /* text-sm */
                font-family: monospace; /* font-mono */
            }     
            
            .language-javascript {
                background: none;
            }

            #messages {
                height: calc(100vh - 150px); /* Adjust based on header, footer, and padding */
            }             
            </style>
        </head>
        <body class="flex flex-col h-screen">
            <div id="chat-container" class="flex flex-col flex-grow p-4">
                <div id="messages" class="flex-grow overflow-y-auto p-2 rounded mb-4"></div>
                    <div class="flex">
                    <textarea id="message-input" rows="2" placeholder="Ask openAI" class="text-black flex-grow p-2 border border-gray-300 rounded mr-2"></textarea>
                    <button id="send-button" class="p-2 bg-blue-500 text-white rounded">Send</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('send-button').addEventListener('click', () => {
                    sendMessage();
                });

                document.getElementById('message-input').addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                });

                function sendMessage() {
                    const input = document.getElementById('message-input');
                    const message = input.value.trim();
                    if (message) {
                        const messagesDiv = document.getElementById('messages');
                        messagesDiv.innerHTML += '<div class="message user-message bg-green-100 self-end">' + message + '</div>';
                        input.value = '';
                        vscode.postMessage({ command: 'sendMessage', text: message });
                        updateState();
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'receiveMessage':
                            const messagesDiv = document.getElementById('messages');
                            messagesDiv.innerHTML += '<div class="code-content message bot-response bg-gray-200 self-start">' + message.text + '</div>';
                            
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            updateState();                            
                            break;
                        case 'restoreState':
                            const state = message.state;
                            if (state) {
                                document.getElementById('messages').innerHTML = state;
                            }
                            break;
                    }
                });

                function updateState() {
                    const messagesDiv = document.getElementById('messages');
                    vscode.setState({ messages: messagesDiv.innerHTML });
                    vscode.postMessage({ command: 'saveState', state: messagesDiv.innerHTML });
                }

                (function() {
                    const state = vscode.getState();
                    if (state) {
                        document.getElementById('messages').innerHTML = state.messages;
                    }
                    document.getElementById('message-input').focus();
                })();
            </script>
        </body>
        </html>`;
}