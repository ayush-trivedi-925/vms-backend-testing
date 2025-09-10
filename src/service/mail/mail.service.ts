import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: true,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.password'),
      },
      debug: true, // enable debug
      logger: true,
    });
  }

  async visitStart(to: string) {
    const mailOptions = {
      from: '"Visit Start" <noreply@yourapp.com>',
      to,
      subject: 'Visit start notification',
      html: `
        <p>Visit has started.</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async visitEnd(to: string) {
    const mailOptions = {
      from: '"Visit End" <noreply@yourapp.com>',
      to,
      subject: 'Visit end notification',
      html: `
        <p>Visit has ended.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
