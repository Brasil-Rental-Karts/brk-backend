declare module 'amqplib' {
  export interface Connection {
    createChannel(): Promise<Channel>;
    close(): Promise<void>;
    serverProperties: any;
    expectSocketClose: any;
    sentSinceLastCheck: any;
    recvSinceLastCheck: any;
    sendMessage: any;
  }

  export interface Channel {
    assertExchange(exchange: string, type: string, options?: object): Promise<any>;
    assertQueue(queue: string, options?: object): Promise<any>;
    bindQueue(queue: string, exchange: string, routingKey: string): Promise<any>;
    publish(exchange: string, routingKey: string, content: Buffer, options?: object): boolean;
    close(): Promise<void>;
    consume(queue: string, onMessage: (msg: any) => void, options?: object): Promise<{ consumerTag: string }>;
    ack(message: any, allUpTo?: boolean): void;
  }

  export function connect(url: string): Promise<Connection>;
} 