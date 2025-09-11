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

  async VisitStartToHost(details: any) {
    const mailOptions = {
      from: '"Visitor Arrival Notification" <noreply@yourapp.com>',
      to: details.staff.email,
      subject: `Visitor Arrival Notification - ${details.fullName} at ${details.organization.name}`,
      html: `
        <p>Dear ${details.staff.name}</p>
        <p>Your visitor has arrived, Visitor's details are:</p>
        <p>Name: ${details.fullName}</p>
        <p>Email: ${details.email}</p>
        <p>Organization: ${details.organization.name}</p>
        <p>Purpose: ${details.reasonOfVisit}</p>

        <p>Please proceed to the reception to greet your visitor.</p>

        <p>Thank you</p>
        <p>${details.organization.name} Security Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async VisitStartToVisitor(details: any) {
    const checkInTime = new Date(details.startTime);
    const formattedTime = checkInTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const mailOptions = {
      from: '"Check-In Notification" <noreply@yourapp.com>',
      to: details.email,
      subject: ` You visit at ${details.organization.name} has started`,
      html: `
        <p>Visit Details</p>
        <p>Host name: ${details.staff.name}</p>
        <p>Email: ${details.staff.email}</p>
        <p>Designation: ${details.staff.designation}</p>
        <p>Department: ${details.staff.department}</p>
        <p>Check-in Time: ${formattedTime}</p>

        <p>Thank you</p>
        <p>${details.organization.name} Reception Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async VisitEndToHost(details: any) {
    const checkOutTime = new Date(details.endTime);
    const formattedTime = checkOutTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const checkInTime = new Date(details.startTime);
    const checkInFormattedTime = checkInTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const mailOptions = {
      from: '"Visitor Departure Notification" <noreply@yourapp.com>',
      to: details.staff.email,
      subject: `Visitor Departure Notification - ${details.fullName} at ${details.organization.name}`,
      html: `
      <p>Dear ${details.staff.name},</p>
      <p>Your visitor has completed their visit.</p>
      <p>Visitor Details:</p>
      <p>Name: ${details.fullName}</p>
      <p>Email: ${details.email}</p>
      <p>Organization: ${details.organization.name}</p>
      <p>Purpose: ${details.reasonOfVisit}</p>
      <p>Check-in Time: ${checkInFormattedTime}</p>
      <p>Check-out Time: ${formattedTime}</p>

      <p>Thank you</p>
      <p>${details.organization.name} Security Team</p>
    `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async VisitEndToVisitor(details: any) {
    const checkOutTime = new Date(details.endTime);
    const formattedTime = checkOutTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const checkInTime = new Date(details.startTime);
    const checkInFormattedTime = checkInTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const mailOptions = {
      from: '"Visit Completion Notification" <noreply@yourapp.com>',
      to: details.email,
      subject: `Your visit at ${details.organization.name} has ended`,
      html: `
      <p>Dear ${details.fullName},</p>
      <p>We hope your visit went well.</p>
      <p>Visit Summary:</p>
      <p>Host Name: ${details.staff.name}</p>
      <p>Email: ${details.staff.email}</p>
      <p>Designation: ${details.staff.designation}</p>
      <p>Department: ${details.staff.department}</p>
      <p>Check-in Time: ${checkInFormattedTime}</p>
      <p>Check-out Time: ${formattedTime}</p>

      <p>Thank you for visiting</p>
      <p>${details.organization.name} Reception Team</p>
    `,
    };
    await this.transporter.sendMail(mailOptions);
  }
}
