import request from '../utils/axios';
import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  SendMessageData,
} from '../types';

export const messagesApi = {
  /**
   * 获取会话列表
   */
  async getConversations(): Promise<ConversationListResponse> {
    return request.get('/messages/conversations');
  },

  /**
   * 获取会话详情（与某个用户的聊天记录）
   * @param userId 对方用户 ID
   * @param page 页码
   * @param pageSize 每页数量
   */
  async getMessages(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<MessageListResponse> {
    return request.get(`/messages/${userId}`, { params: { page, pageSize } });
  },

  /**
   * 发送消息
   */
  async sendMessage(data: SendMessageData): Promise<{ data: Message }> {
    return request.post('/messages', data);
  },

  /**
   * 标记会话已读
   */
  async markAsRead(userId: string): Promise<void> {
    return request.put(`/messages/${userId}/read`);
  },

  /**
   * 删除会话
   */
  async deleteConversation(userId: string): Promise<void> {
    return request.delete(`/messages/conversations/${userId}`);
  },
};
