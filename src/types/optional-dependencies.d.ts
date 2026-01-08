// 可選依賴的類型聲明
// 這些模組是可選的，可能未安裝

declare module 'twilio' {
  export default function (accountSid: string, authToken: string): any;
}

declare module '@aws-sdk/client-sns' {
  export class SNSClient {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class PublishCommand {
    constructor(params: any);
  }
}

