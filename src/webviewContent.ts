export function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
            body {
                overflow: hidden;
            }        
            .message {
                padding: 10px;
                border-radius: 10px;
                margin-bottom: 10px;
                position: relative;
                font-size: 14px;
                color: #333;
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
                background-color: #f7fafc;
                border: 1px solid #e2e8f0;
                border-radius: 0.375rem;
                padding: 1rem;
                margin-top: 1rem;
                margin-bottom: 1rem;
                overflow-x: auto;
            }
    
            .code-content {
                font-size: 0.875rem;
                font-family: monospace;
            }
    
            #messages {
                overflow-x: hidden;
                height: calc(100vh - 160px);
            }
    
            .flex-container {
                display: flex;
                align-items: flex-start;
            }
    
            .user-icon,
            .bot-icon {
                font-size: 40px;
                margin-right: 10px;
                color: white; 
            }
    
            .user-message-container {
                justify-content: flex-end;
            }
    
            .bot-message-container {
                justify-content: flex-start;
            }
    
            .language-javascript {
                background: none;
            }      
            
            .code-window {
                border: 1px solid #ccc;
                border-radius: 5px;
                margin: 10px 0;
                overflow: hidden;
            }
            .code-header {
                background-color: #f0f0f0;
                padding: 5px 10px;
                font-weight: bold;
                border-bottom: 1px solid #ccc;
            }
            pre {
                margin: 0;
                padding: 10px;
                background-color: #f9f9f9;
            }            
        </style>
    </head>
    <body class="flex flex-col h-screen" style="background:black">
        <div id="chat-container" class="flex flex-col flex-grow p-4">
            <div id="messages" class="flex-grow overflow-y-auto p-2 rounded mb-4"></div>
            <div class="flex flex-col">
                <select id="language-model" class="mb-4 p-2 border border-gray-300 rounded w-full">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>  
                <div class="flex">
                    <textarea id="message-input" rows="2" placeholder="Type a message" class="flex-grow p-2 border border-gray-300 rounded mr-2"></textarea>
                    <button id="send-button" class="p-2 bg-blue-500 text-white rounded">Send</button>
                </div>
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

            function escapeHtml(html) {
                return html
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

    
            function sendMessage() {
                const input = document.getElementById('message-input');
                const message = input.value.trim();
                const model = document.getElementById('language-model').value;
                const sanitizedHtmlContent = escapeHtml(message);
                if (message) {
                    const messagesDiv = document.getElementById('messages');
                    const userMessageHTML = \`
                        <div class="flex-container user-message-container">
                            <div class="message user-message bg-green-100 self-end"><pre>\${sanitizedHtmlContent}</pre></div>
                            <i class="fas fa-user user-icon"></i>
                        </div>\`;
                    messagesDiv.innerHTML += userMessageHTML;
                    input.value = '';
                    vscode.postMessage({ command: 'sendMessage', text: message, model: model });
                    updateState();
                }
            }
    
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'receiveMessage':
                        const messagesDiv = document.getElementById('messages');
                        const botMessageHTML = \`                    
                            <div class="flex-container bot-message-container">
                                <i class="fas fa-robot bot-icon"></i>
                                <div class="code-content message bot-response bg-gray-200 self-start">\${message.text}</div>
                            </div>\`;
                        messagesDiv.innerHTML += botMessageHTML;
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
    </html>
    `;
}