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
      debug: true,
      logger: true,
    });
  }

  /** Format date safely */
  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  async VisitStartToHost(details: any) {
    const mailOptions = {
      from: '"Visitor Arrival Notification" <noreply@yourapp.com>',
      to: details.staff?.email,
      subject: `Visitor Arrival Notification - ${details.fullName} at ${details.organization?.name}`,
      html: `
        <p>Dear ${details.staff?.name || 'Staff'},</p>
        <p>Your visitor has arrived, Visitor's details are:</p>
        <p><b>Name:</b> ${details.fullName}</p>
        <p><b>Email:</b> ${details.email}</p>
        <p><b>Organization:</b> ${details.visitorOrganization}</p>
        <p><b>Purpose:</b> ${details.reasonOfVisit?.name}</p>

        <p>Please proceed to the reception to greet your visitor.</p>
        <p>Thank you</p>
        <p>${details.organization?.name || 'Our Company'} Security Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async OrganizationRegistration(details: any) {
    const org = details;

    const mailOptions = {
      from: `"Visitor Management System" <no-reply@segueit.com>`,
      to: org?.email,
      subject: `Your Organization Has Been Successfully Registered - ${org.name}`,
      html: `
      <p>Dear ${org?.contactPerson || 'Valued Partner'},</p>

      <p>We’re delighted to inform you that your organization has been successfully registered on the <b>SegueIT Visitor Management System</b>.</p>

      <p>Here are your organization’s registration details:</p>
      <ul>
        <li><b>Organization Name:</b> ${org.name}</li>
        <li><b>Email:</b> ${org.email}</li>
        <li><b>Address:</b> ${org.address}</li>
        <li><b>Contact Number:</b> ${org.contactNumber}</li>
        <li><b>Contact Person:</b> ${org.contactPerson}</li>
        <li><b>GST:</b> ${org.gst || 'N/A'}</li>
      </ul>

      <p>To activate your dashboard access, please provide the <b>Super Admin’s email address</b>. 
      This will allow us to assign appropriate roles and grant system access for managing your organization’s visitor data.</p>

      <p>Thank you for choosing <b>SegueIT Visitor Management System</b> to streamline your visitor check-ins and enhance workplace security.</p>

      <p>Best regards,<br/>
      <b>SegueIT Visitor Management Team</b></p>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitStartToVisitor(details: any) {
    const formattedTime = this.formatDate(details.startTime);

    const mailOptions = {
      from: '"Check-In Notification" <noreply@yourapp.com>',
      to: details.email,
      subject: `Your visit at ${details.organization?.name} has started`,
      html: `
        <p>Visit Details</p>
        <p><b>Host Name:</b> ${details.staff?.name}</p>
        <p><b>Email:</b> ${details.staff?.email}</p>
        <p><b>Designation:</b> ${details.staff?.designation || 'N/A'}</p>
        <p><b>Department:</b> ${details.staff?.department?.name || 'Not Assigned'}</p>
        <p><b>Check-in Time:</b> ${formattedTime}</p>

        <p>Thank you</p>
        <p>${details.organization?.name || 'Our Company'} Reception Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendForgotPasswordOTP(details: any) {
    const mailOptions = {
      from: `"Visitor Management System" <no-reply@segueit.com>`,
      to: details.email,
      subject: `Your OTP for Password Reset - SegueIT Visitor Management System`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Password Reset Request</h2>
        <p>Dear ${details.name || 'User'},</p>

        <p>We received a request to reset your password for the <b>SegueIT Visitor Management System</b> account associated with this email address.</p>

        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="background: #f3f4f6; padding: 12px 18px; border-radius: 8px; display: inline-block; margin: 10px 0;">
          <h1 style="color: #2b6cb0; letter-spacing: 4px; margin: 0;">${details.otp}</h1>
        </div>

        <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

        <p>Thank you,<br/>
        <b>SegueIT Visitor Management Team</b></p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitEndToHost(details: any) {
    const checkOutTime = this.formatDate(details.endTime);
    const checkInTime = this.formatDate(details.startTime);

    const mailOptions = {
      from: '"Visitor Departure Notification" <noreply@yourapp.com>',
      to: details.staff?.email,
      subject: `Visitor Departure Notification - ${details.fullName} at ${details.organization?.name}`,
      html: `
        <p>Dear ${details.staff?.name || 'Staff'},</p>
        <p>Your visitor has completed their visit.</p>
        <p><b>Visitor Details:</b></p>
        <p><b>Name:</b> ${details.fullName}</p>
        <p><b>Email:</b> ${details.email}</p>
        <p><b>Organization:</b> ${details.visitorOrganization}</p>
        <p><b>Purpose:</b> ${details.reasonOfVisit?.name}</p>
        <p><b>Check-in Time:</b> ${checkInTime}</p>
        <p><b>Check-out Time:</b> ${checkOutTime}</p>

        <p>Thank you</p>
        <p>${details.organization?.name || 'Our Company'} Security Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async VisitEndToVisitor(details: any) {
    const checkOutTime = this.formatDate(details.endTime);
    const checkInTime = this.formatDate(details.startTime);

    const mailOptions = {
      from: '"Visit Completion Notification" <noreply@yourapp.com>',
      to: details.email,
      subject: `Your visit at ${details.organization?.name} has ended`,
      html: `
        <p>Dear ${details.fullName},</p>
        <p>We hope your visit went well.</p>
        <p><b>Visit Summary:</b></p>
        <p><b>Host Name:</b> ${details.staff?.name}</p>
        <p><b>Email:</b> ${details.staff?.email}</p>
        <p><b>Designation:</b> ${details.staff?.designation || 'N/A'}</p>
        <p><b>Department:</b> ${details.staff?.department?.name || 'Not Assigned'}</p>
        <p><b>Check-in Time:</b> ${checkInTime}</p>
        <p><b>Check-out Time:</b> ${checkOutTime}</p>

        <p>Thank you for visiting</p>
        <p>${details.organization?.name || 'Our Company'} Reception Team</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }
}
