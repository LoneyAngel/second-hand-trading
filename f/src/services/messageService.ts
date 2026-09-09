import { messagesApi } from '../api';
import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  SendMessageData,
} from '../types';

/**
 * 消息服务 - 处理私信/聊天相关的业务逻辑
 */
class MessageService {
  /**
   * 获取会话列表
   */
  async getConversations(): Promise<ConversationListResponse> {
    return messagesApi.getConversations();
  }

  /**
   * 获取与某个用户的消息列表
   */
  async getMessages(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<MessageListResponse> {
    return messagesApi.getMessages(userId, page, pageSize);
  }

  /**
   * 发送消息
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    const res = await messagesApi.sendMessage(data);
    return res.data;
  }

  /**
   * 标记会话已读
   */
  async markAsRead(userId: string): Promise<void> {
    return messagesApi.markAsRead(userId);
  }

  /**
   * 删除会话
   */
  async deleteConversation(userId: string): Promise<void> {
    return messagesApi.deleteConversation(userId);
  }
}

export const messageService = new MessageService();
