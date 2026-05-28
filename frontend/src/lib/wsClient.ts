/**
 * Singleton WebSocket client shared across the entire dashboard.
 * Only one connection is kept open at a time, avoiding duplicate messages.
 */
export const wsClient = {
  socket: null as WebSocket | null,

  send(data: object): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  },

  sendMessage(receiverId: string, content: string, replyToId?: string) {
    return this.send({
      type: 'chat_message',
      payload: { receiver_id: receiverId, content, reply_to_id: replyToId },
    });
  },

  sendTyping(receiverId: string, isTyping: boolean) {
    return this.send({
      type: 'typing',
      payload: { receiver_id: receiverId, is_typing: isTyping },
    });
  },

  sendReadReceipt(senderId: string, messageIds: string[]) {
    return this.send({
      type: 'read_receipt',
      payload: { sender_id: senderId, message_ids: messageIds },
    });
  },
};
