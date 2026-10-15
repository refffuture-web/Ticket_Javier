export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class UnconfiguredMailer implements Mailer {
  async send(_message: MailMessage): Promise<void> {
    throw new Error("El envío de email no está configurado");
  }
}
