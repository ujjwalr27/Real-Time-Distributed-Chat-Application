// Chat Application
const ChatApp = {
    roomName: null,
    username: null,
    chatLog: null,
    chatSocket: null,
    typingTimeout: null,
    replyingToMessage: null,
    editingMessage: null,
    userStatuses: new Map(),

    init: function(roomName, username) {
        this.roomName = roomName;
        this.username = username;
        this.chatLog = document.querySelector('#chat-log');
        this.typingTimeout = null;
        this.replyingToMessage = null;
        this.editingMessage = null;
        this.userStatuses = new Map();
        
        this.initWebSocket();
        this.initEventListeners();
        this.loadTheme();
        this.scrollToBottom();
    },

    initWebSocket: function() {
        const wsStart = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        this.chatSocket = new WebSocket(
            wsStart + window.location.host + '/ws/chat/' + this.roomName + '/'
        );

        this.chatSocket.onopen = () => console.log('WebSocket connection established');
        this.chatSocket.onerror = (e) => console.error('WebSocket error:', e);
        this.chatSocket.onmessage = this.handleWebSocketMessage.bind(this);
        this.chatSocket.onclose = this.handleWebSocketClose.bind(this);
    },

    initEventListeners: function() {
        const messageInput = document.querySelector('#chat-message-input');
        messageInput.focus();
        messageInput.addEventListener('keyup', this.handleKeyPress.bind(this));
        messageInput.addEventListener('input', this.sendTypingStatus.bind(this));

        document.querySelector('#chat-message-submit').onclick = this.handleMessageSubmit.bind(this);
        document.querySelector('#file-upload').addEventListener('change', this.handleFileUpload.bind(this));
        document.querySelector('.theme-toggle').onclick = this.toggleTheme.bind(this);

        // Add event delegation for message actions
        document.querySelector('#chat-log').addEventListener('click', (e) => {
            const button = e.target.closest('.action-button');
            if (!button) return;
            
            const action = button.dataset.action;
            const messageId = button.dataset.messageId;
            
            switch(action) {
                case 'reply': this.replyToMessage(messageId); break;
                case 'react': this.showReactionPicker(messageId); break;
                case 'edit': this.editMessage(messageId); break;
                case 'delete': this.deleteMessage(messageId); break;
            }
        });

        document.querySelectorAll('.message').forEach(message => {
            this.sendReadReceipt(message.dataset.messageId);
        });
    },

    loadTheme: function() {
        document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    },

    scrollToBottom: function() {
        if (this.chatLog) {
            this.chatLog.scrollTop = this.chatLog.scrollHeight;
        }
    },

    handleKeyPress: function(e) {
        if (e.keyCode === 13) {
            document.querySelector('#chat-message-submit').click();
        }
    },

    handleWebSocketMessage: function(e) {
        const data = JSON.parse(e.data);
        
        switch(data.type) {
            case 'chat_message':
                this.handleNewMessage(data);
                break;
            case 'typing_status':
                this.handleTypingStatus(data);
                break;
            case 'message_reaction':
                this.handleMessageReaction(data);
                break;
            case 'read_receipt':
                this.handleReadReceipt(data);
                break;
            case 'user_status':
                this.updateUserStatus(data.user_id, data.status);
                break;
            case 'message_edit':
                this.handleMessageEdit(data);
                break;
            case 'message_delete':
                this.handleMessageDelete(data);
                break;
        }
    },

    handleWebSocketClose: function(e) {
        console.error('Chat socket closed unexpectedly');
        setTimeout(() => {
            console.log('Attempting to reconnect...');
            window.location.reload();
        }, 1000);
    },

    toggleTheme: function() {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    handleMessageSubmit: function(e) {
        const messageInput = document.querySelector('#chat-message-input');
        const message = messageInput.value.trim();
        const fileInput = document.querySelector('#file-upload');
        const file = fileInput.files[0];

        if (message || file) {
            const messageData = {
                type: 'message',
                message: message,
                username: this.username
            };

            if (this.replyingToMessage) {
                messageData.parent_id = this.replyingToMessage;
            }

            if (this.editingMessage) {
                messageData.type = 'edit_message';
                messageData.message_id = this.editingMessage;
            }

            this.chatSocket.send(JSON.stringify(messageData));
            messageInput.value = '';
            fileInput.value = '';
            this.replyingToMessage = null;
            this.editingMessage = null;
            messageInput.placeholder = 'Type your message...';
        }
    },

    handleFileUpload: async function(e) {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('room_id', this.roomName);

            try {
                const response = await fetch('/chat/upload/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    this.chatSocket.send(JSON.stringify({
                        type: 'message',
                        message: `Shared a file: ${file.name}`,
                        username: this.username,
                        file_url: data.file_url
                    }));
                }
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        }
    },

    sendTypingStatus: function() {
        clearTimeout(this.typingTimeout);
        this.chatSocket.send(JSON.stringify({
            type: 'typing',
            username: this.username
        }));
        this.typingTimeout = setTimeout(() => {
            this.chatSocket.send(JSON.stringify({
                type: 'typing_stopped',
                username: this.username
            }));
        }, 1000);
    },

    handleTypingStatus: function(data) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (data.username !== this.username) {
            typingIndicator.textContent = `${data.username} is typing...`;
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(() => {
                typingIndicator.textContent = '';
            }, 1000);
        }
    },

    handleNewMessage: function(data) {
        const messageDiv = this.createMessageElement(data);
        this.chatLog.appendChild(messageDiv);
        this.scrollToBottom();
        this.sendReadReceipt(data.message_id);
    },

    createMessageElement: function(data) {
        const div = document.createElement('div');
        div.className = `message ${data.username === this.username ? 'sent' : ''}`;
        div.dataset.messageId = data.message_id;

        // Add message header
        const header = document.createElement('div');
        header.className = 'message-header';
        header.innerHTML = `
            <span class="user-status" data-user-id="${data.user_id}"></span>
            <span class="message-user">${data.username}</span>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;

        // Add message content
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = data.message;

        // Add file if present
        if (data.file_url) {
            const file = document.createElement('div');
            file.className = 'message-file';
            file.innerHTML = `
                <a href="${data.file_url}" target="_blank">
                    <i class="fas fa-file"></i> ${data.file_url.split('/').pop()}
                </a>
            `;
            content.appendChild(file);
        }

        div.appendChild(header);
        div.appendChild(content);
        div.appendChild(this.createMessageActions(data));
        div.appendChild(document.createElement('div')).className = 'message-reactions';
        div.appendChild(document.createElement('div')).className = 'read-receipts';

        return div;
    },

    createMessageActions: function(data) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const buttons = [
            { icon: 'reply', text: 'Reply', onClick: () => this.replyToMessage(data.message_id) },
            { icon: 'smile', text: 'React', onClick: () => this.showReactionPicker(data.message_id) }
        ];

        if (data.username === this.username) {
            buttons.push(
                { icon: 'edit', text: 'Edit', onClick: () => this.editMessage(data.message_id) },
                { icon: 'trash', text: 'Delete', onClick: () => this.deleteMessage(data.message_id) }
            );
        }

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = 'action-button';
            btn.innerHTML = `<i class="fas fa-${button.icon}"></i> ${button.text}`;
            btn.onclick = button.onClick;
            actions.appendChild(btn);
        });

        return actions;
    },

    replyToMessage: function(messageId) {
        this.replyingToMessage = messageId;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const messageContent = messageElement.querySelector('.message-content').textContent;
        document.querySelector('#chat-message-input').placeholder = `Replying to: ${messageContent.substring(0, 50)}...`;
    },

    editMessage: function(messageId) {
        this.editingMessage = messageId;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const messageContent = messageElement.querySelector('.message-content').textContent;
        const input = document.querySelector('#chat-message-input');
        input.value = messageContent;
        input.focus();
    },

    deleteMessage: function(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            this.chatSocket.send(JSON.stringify({
                type: 'delete_message',
                message_id: messageId
            }));
        }
    },

    showReactionPicker: function(messageId) {
        const picker = new EmojiMart.Picker({
            onSelect: emoji => {
                this.addReaction(messageId, emoji.native);
                document.querySelector('.emoji-mart').remove();
            },
            style: {
                position: 'absolute',
                right: '20px',
                zIndex: 1000
            }
        });
        
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        const existingPicker = document.querySelector('.emoji-mart');
        if (existingPicker) {
            existingPicker.remove();
        }
        message.appendChild(picker.element);
    },

    addReaction: function(messageId, emoji) {
        this.chatSocket.send(JSON.stringify({
            type: 'reaction',
            message_id: messageId,
            emoji: emoji
        }));
    },

    handleMessageReaction: function(data) {
        const message = document.querySelector(`[data-message-id="${data.message_id}"]`);
        if (message) {
            const reactions = message.querySelector('.message-reactions');
            const existingReaction = reactions.querySelector(`[data-emoji="${data.emoji}"]`);
            
            if (existingReaction) {
                const count = parseInt(existingReaction.getAttribute('data-count')) + 1;
                existingReaction.setAttribute('data-count', count);
                existingReaction.querySelector('.reaction-count').textContent = count;
            } else {
                const reaction = document.createElement('span');
                reaction.className = 'reaction';
                reaction.setAttribute('data-emoji', data.emoji);
                reaction.setAttribute('data-count', '1');
                reaction.innerHTML = `${data.emoji}<span class="reaction-count">1</span>`;
                reaction.onclick = () => this.addReaction(data.message_id, data.emoji);
                reactions.appendChild(reaction);
            }
        }
    },

    sendReadReceipt: function(messageId) {
        this.chatSocket.send(JSON.stringify({
            type: 'read_receipt',
            message_id: messageId
        }));
    },

    handleReadReceipt: function(data) {
        const message = document.querySelector(`[data-message-id="${data.message_id}"]`);
        if (message) {
            const readReceipts = message.querySelector('.read-receipts');
            const existingReceipt = readReceipts.querySelector(`[data-user-id="${data.user_id}"]`);
            if (!existingReceipt) {
                const receipt = document.createElement('span');
                receipt.className = 'read-receipt';
                receipt.setAttribute('data-user-id', data.user_id);
                receipt.innerHTML = '<i class="fas fa-check"></i>';
                receipt.title = `Read by ${data.username}`;
                readReceipts.appendChild(receipt);
            }
        }
    },

    updateUserStatus: function(userId, status) {
        const statusIndicators = document.querySelectorAll(`[data-user-id="${userId}"]`);
        statusIndicators.forEach(indicator => {
            indicator.className = `user-status ${status}`;
        });
        this.userStatuses.set(userId, status);
    },

    handleMessageEdit: function(data) {
        const message = document.querySelector(`[data-message-id="${data.message_id}"]`);
        if (message) {
            const content = message.querySelector('.message-content');
            content.textContent = data.message;
            const editedTag = document.createElement('span');
            editedTag.className = 'edited-tag';
            editedTag.textContent = ' (edited)';
            content.appendChild(editedTag);
        }
    },

    handleMessageDelete: function(data) {
        const message = document.querySelector(`[data-message-id="${data.message_id}"]`);
        if (message) {
            const content = message.querySelector('.message-content');
            content.innerHTML = '<i>This message has been deleted</i>';
            content.style.color = '#666';
            message.querySelector('.message-actions').remove();
        }
    }
}; 