import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`[EventsGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[EventsGateway] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (data && data.groupId) {
      const room = `group_${data.groupId}`;
      client.join(room);
      this.logger.log(`[EventsGateway] Client ${client.id} joined room ${room}`);
    }
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (data && data.groupId) {
      const room = `group_${data.groupId}`;
      client.leave(room);
      this.logger.log(`[EventsGateway] Client ${client.id} left room ${room}`);
    }
  }

  @SubscribeMessage('joinWorkspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (data && data.workspaceId) {
      const room = `workspace_${data.workspaceId}`;
      client.join(room);
      this.logger.log(`[EventsGateway] Client ${client.id} joined room ${room}`);
    }
  }

  @SubscribeMessage('leaveWorkspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (data && data.workspaceId) {
      const room = `workspace_${data.workspaceId}`;
      client.leave(room);
      this.logger.log(`[EventsGateway] Client ${client.id} left room ${room}`);
    }
  }

  broadcastNewMessage(groupId: string, message: any) {
    const room = `group_${groupId}`;
    this.server.to(room).emit('message:received', message);
    this.logger.log(`[EventsGateway] Broadcasted message to room ${room}`);
  }

  broadcastMemberKicked(workspaceId: string, kickedUserId: string) {
    const room = `workspace_${workspaceId}`;
    this.server.to(room).emit('member:kicked', { workspaceId, kickedUserId });
    this.logger.log(`[EventsGateway] Broadcasted member:kicked to room ${room} for user ${kickedUserId}`);
  }
}
