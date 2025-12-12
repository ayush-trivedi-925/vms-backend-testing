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
    const attachments: any = [];

    // If QR code buffer exists, add it as attachment
    if (details.qrCodeBuffer) {
      attachments.push({
        filename: `qr-code-${details.id}.png`,
        content: details.qrCodeBuffer,
        contentType: 'image/png',
        cid: 'visitQrCode', // same cid value as in the html img src
      });
    }
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
         ${
           details.qrCodeBuffer
             ? `
        <p>QR Code for visitor check-out:</p>
        <img src="cid:visitQrCode" alt="Visit QR Code" width="200" height="200" style="display:block;"/>
      `
             : ''
         }

        <p>Please proceed to the reception to greet your visitor.</p>
        <p>Thank you</p>
        <p>${details.organization?.name || 'Our Company'} Security Team</p>
      `,
      attachments: attachments,
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
    const attachments: any = [];

    // If QR code buffer exists, add it as attachment
    if (details.qrCodeBuffer) {
      attachments.push({
        filename: `qr-code-${details.id}.png`,
        content: details.qrCodeBuffer,
        contentType: 'image/png',
        cid: 'visitQrCode', // same cid value as in the html img src
      });
    }

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
       
         ${
           details.qrCodeBuffer
             ? `
       <p>Please present this QR code at the reception:</p>
        <img src="cid:visitQrCode" alt="Visit QR Code" width="200" height="200" style="display:block;"/>
      `
             : ''
         }

        <p>Thank you</p>
        <p>${details.organization?.name || 'Our Company'} Reception Team</p>
      `,
      attachments: attachments,
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

  async sendForgotPasswordOTPSystem(details: any) {
    const mailOptions = {
      from: `"Visitor Management System" <no-reply@segueit.com>`,
      to: details.email,
      subject: `Your OTP for Password Reset - SegueIT Visitor Management System`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Password Reset Request</h2>
        <p>${details.organizationName || 'User'},</p>

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

  async sendUserRegistrationMail(
    staff: any,
    organization: any,
    oneTimePassword: string,
    role: string,
  ) {
    const mailOptions = {
      from: `"${organization.name} Account Setup" <noreply@yourapp.com>`,
      to: staff.email,
      subject: `Your ${organization.name} account has been created`,
      html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0078D7;">Welcome to ${organization.name}</h2>

        <p>Dear <strong>${staff.name}</strong>,</p>

        <p>Your account has been created with <strong>${organization.name}</strong>.</p>

        <p><b>Login Details:</b></p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              <strong>Role:</strong>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              ${role}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              <strong>Email:</strong>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              ${staff.email}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              <strong>One-Time Password:</strong>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              <span style="font-size: 16px; color: #0078D7;"><b>${oneTimePassword}</b></span>
            </td>
          </tr>
        </table>

        <p style="margin-top: 20px;">
          Please use this one-time password to log in and set up your new password.
        </p>

        <p>Thank you,</p>
        <p style="font-weight: bold;">${organization.name} Team</p>

        <hr style="margin-top: 30px; border: none; border-bottom: 1px solid #ddd;" />

        <p style="font-size: 12px; color: #555;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async StaffRegistration(staff: any, org: any) {
    const mailOptions = {
      from: `"Visitor Management System" <no-reply@segueit.com>`,
      to: staff?.email,
      subject: `Your Staff Account Has Been Successfully Created - ${org.name}`,
      html: `
      <p>Dear ${staff?.name || 'Team Member'},</p>

      <p>We are pleased to inform you that your staff profile has been successfully created in the <b>SegueVisit Visitor Management System</b>.</p>

      <p>Here are your registration details:</p>

      <ul>
        <li><b>Name:</b> ${staff.name}</li>
        <li><b>Email:</b> ${staff.email}</li>
        <li><b>Employee ID:</b> ${staff.employeeCode}</li>
        <li><b>Designation:</b> ${staff.designation}</li>
        <li><b>Department:</b> ${staff.departmentName}</li>
        <li><b>Organization:</b> ${org.name}</li>
        
      </ul>
        ${
          staff.qrCodeBuffer
            ? `
        <p>QR Code:</p>
        <img src="cid:empQrCode" alt="Employee QR Code" width="200" height="200" style="display:block;"/>
      `
            : ''
        }


      <b>Use the Employee ID for attendance at the system.</b>

      <p>Your account has been added by the organization administrator.
      If you believe any of the above details are incorrect, please contact your admin for assistance.</p>

      <p>Thank you for being part of <b>${org.name}</b>.
      We look forward to your valuable contribution.</p>

      <p>Best regards,<br/>
      <b>SegueIT Visitor Management Team</b></p>
    `,
      attachments: staff.qrCodeBuffer
        ? [
            {
              filename: 'employee-qr.png',
              content: staff.qrCodeBuffer,
              cid: 'empQrCode', // IMPORTANT: must match <img src="cid:empQrCode">
            },
          ]
        : [],
    };

    await this.transporter.sendMail(mailOptions);
  }
}
