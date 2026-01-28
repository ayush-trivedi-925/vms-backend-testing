import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: ['http://localhost:5173', 'http://192.168.1.5:5173'],
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(socket: Socket) {
    const userId = socket.handshake.auth.userId;
    console.log('Socket connected:', socket.id, 'room:', userId);
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(userId); // each staff gets their own room
  }

  sendToStaff(userId: string, payload: any) {
    this.server.to(userId).emit('notification', payload);
  }
}
