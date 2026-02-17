import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: 'notifications@mail.seguevisit.com',
        pass: this.configService.get<string>('MAILGUN_SMTP_PASS'),
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
      from: '"Visitor Arrival Notification" <notifications@mail.seguevisit.com>',
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

         
         ${
           details.reason
             ? `<p>Reminder:</p>
        <p>${details.reason}</p>`
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
      from: `"SegueVisit Staff & Visitor Management System" <notifications@mail.seguevisit.com>`,
      to: org?.email,
      subject: `Your Organization Has Been Successfully Registered - ${org.name}`,
      html: `
      <p>Dear ${org?.contactPerson || 'Valued Partner'},</p>

      <p>We’re delighted to inform you that your organization has been successfully registered on the <b>SegueVisit Staff & Visitor Management System</b>.</p>

      <p>Here are your organization’s registration details:</p>
      <ul>
        <li><b>Organization Name:</b> ${org.name}</li>
        <li><b>Email:</b> ${org.email}</li>
        <li><b>Address:</b> ${org.address}</li>
        <li><b>Contact Number:</b> ${org.contactNumber}</li>
        <li><b>Contact Person:</b> ${org.contactPerson}</li>
        <li><b>GST:</b> ${org.gst || 'N/A'}</li>
      </ul>

      <p>To activate your dashboard access, please provide the <b>Super Admin’s</b> email address.
      This will allow us to assign appropriate roles and grant system access for managing your organization’s data. If you already provided details, please ignore.</p>

      <p>Thank you for choosing <b>SegueVisit Staff & Visitor Management System</b> to streamline your visitor check-ins and enhance workplace security.</p>

      <p>Best regards,<br/>
      <b>SegueVisit Staff & Visitor Management System</b></p>
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
      from: '"Check-In Notification" <notifications@mail.seguevisit.com>',
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
      <p>
        Please present the QR code below at the reception kiosk to check out.
        If you wish to print your visitor badge (which includes your visit details and QR code),
        select the <b>“Check Status”</b> option on the kiosk, enter your registered email address,
        and click <b>Print</b>.
      </p>
      <img
        src="cid:visitQrCode"
        alt="Visit QR Code"
        width="200"
        height="200"
        style="display:block;"
      />
    `
            : ''
        }
           ${
             details.reason
               ? `
      <div style="
        margin: 16px 0;
        padding: 12px 14px;
        background-color: #fff4f4;
        border-left: 4px solid #dc2626;
        border-radius: 4px;
      ">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #7f1d1d;">
          Message from ${details.staff?.name}:
        </p>
        <p style="margin: 0; color: #333;">
          ${details.reason}
        </p>
      </div>
    `
               : ''
           }

        <p>Thank you.</p>

        <p>${details.organization?.name || 'Our Company'} Reception Team</p>
      `,
      attachments: attachments,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendForgotPasswordOTP(details: any) {
    const mailOptions = {
      from: `"SegueVisit Staff & Visitor Management System" <notifications@mail.seguevisit.com>`,
      to: details.email,
      subject: `Your OTP for Password Reset - SegueVisit Staff & Visitor Management System`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Password Reset Request</h2>
        <p>Dear ${details.name || 'User'},</p>

        <p>We received a request to reset your password for the <b>SegueVisit Staff & Visitor Management System</b> account associated with this email address.</p>

        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="background: #f3f4f6; padding: 12px 18px; border-radius: 8px; display: inline-block; margin: 10px 0;">
          <h1 style="color: #2b6cb0; letter-spacing: 4px; margin: 0;">${details.otp}</h1>
        </div>

        <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

        <p>Thank you,<br/>
        <b>SegueVisit Staff & Visitor Management System</b></p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendForgotPasswordOTPSystem(details: any) {
    const mailOptions = {
      from: `"SegueVisit Staff & Visitor Management System" <notifications@mail.seguevisit.com>`,
      to: details.email,
      subject: `Your OTP for Password Reset - SegueVisit Staff & Visitor Management System`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Password Reset Request</h2>
        <p>${details.organizationName || 'User'},</p>

        <p>We received a request to reset your password for the <b>SegueVisit Staff & Visitor Management System</b> account associated with this email address.</p>

        <p>Your One-Time Password (OTP) for verification is:</p>

        <div style="background: #f3f4f6; padding: 12px 18px; border-radius: 8px; display: inline-block; margin: 10px 0;">
          <h1 style="color: #2b6cb0; letter-spacing: 4px; margin: 0;">${details.otp}</h1>
        </div>

        <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

        <p>Thank you,<br/>
        <b>SegueVisit Staff & Visitor Management System</b></p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitEndToHost(details: any) {
    const checkOutTime = this.formatDate(details.endTime);
    const checkInTime = this.formatDate(details.startTime);

    const mailOptions = {
      from: '"Visitor Departure Notification" <notifications@mail.seguevisit.com>',
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
      from: '"Visit Completion Notification" <notifications@mail.seguevisit.com>',
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
      from: `"${organization.name} Account Setup" <notifications@mail.seguevisit.com>`,
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
      from: `"SegueVisit Staff & Visitor Management System" <notifications@mail.seguevisit.com>`,
      to: staff?.email,
      subject: `Your Staff Account Has Been Successfully Created - ${org.name}`,
      html: `
      <p>Dear ${staff?.name || 'Team Member'},</p>

      <p>We are pleased to inform you that your staff profile has been successfully created in the <b>SegueVisit Staff & Visitor Management System</b>.</p>

      <p>Here are your registration details:</p>

      <ul>
        <li><b>One time password:</b> ${staff.oneTimePassword}</li>
        <li><b>Name:</b> ${staff.name}</li>
        <li><b>Email:</b> ${staff.email}</li>
        <li><b>Employee ID:</b> ${staff.employeeCode}</li>
        <li><b>Designation:</b> ${staff.designation}</li>
        <li><b>Department:</b> ${staff.departmentName}</li>
        <li><b>Organization:</b> ${org.name}</li>
        
      </ul>
      
      <b>Use on time password to login to the dashboard at https://vms.seguevisit.com/login</b>


      <b>Use the Employee ID for attendance at the system.</b>

      <p>Your account has been added by the organization administrator.
      If you believe any of the above details are incorrect, please contact your admin for assistance.</p>

      <p>Thank you for being part of <b>${org.name}</b>.
      We look forward to your valuable contribution.</p>

      <p>Best regards,<br/>
      <b>SegueVisit Visitor Management Team</b></p>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitRejectToVisitor(details: any) {
    const formattedTime = this.formatDate(details.createdAt);

    const mailOptions = {
      from: '"Reception Team" <notifications@mail.seguevisit.com>',
      to: details.email,
      subject: `Visit Request Update – ${details.organization?.name}`,
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <p>Dear ${details.fullName || 'Visitor'},</p>

        <p>
          Thank you for your interest in visiting <b>${details.organization?.name || 'our organization'}</b>.
          After careful review, we regret to inform you that your visit request scheduled for
          <b>${formattedTime}</b> has been <b>declined</b>.
        </p>

        <p><b>Visit Details:</b></p>
        <ul>
          <li><b>Host Name:</b> ${details.staff?.name}</li>
          <li><b>Host Email:</b> ${details.staff?.email}</li>
          <li><b>Designation:</b> ${details.staff?.designation || 'N/A'}</li>
          <li><b>Department:</b> ${details.staff?.department?.name || 'Not Assigned'}</li>
          <li><b>Request Time:</b> ${formattedTime}</li>
        </ul>

    ${
      details.reason
        ? `
      <div style="
        margin: 16px 0;
        padding: 12px 14px;
        background-color: #fff4f4;
        border-left: 4px solid #dc2626;
        border-radius: 4px;
      ">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #7f1d1d;">
          Message from ${details.staff?.name}:
        </p>
        <p style="margin: 0; color: #333;">
          ${details.reason}
        </p>
      </div>
    `
        : ''
    }

     <p>
          This decision may be due to scheduling constraints or internal policies.
          We sincerely apologize for any inconvenience this may cause.
        </p>

        <p>
          You are welcome to submit a new visit request.
          If you have any questions, please feel free to reach out to the host directly.
        </p>

        <p>
          Kind regards,<br />
          <b>${details.organization?.name || 'Our Company'} Reception Team</b>
        </p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitRequestToHost(details: any) {
    const mailOptions = {
      from: '"Visit Request Notification" <notifications@mail.seguevisit.com>',
      to: details.staff?.email,
      subject: `Visit Request from ${details.fullName} - ${details.organization?.name}`,
      html: `
      <p>Dear ${details.staff?.name || 'Staff'},</p>

      <p>You have received a new visitor request. The details are as follows:</p>

      <p><b>Visitor Name:</b> ${details.fullName}</p>
      <p><b>Email:</b> ${details.email}</p>
      <p><b>Organization:</b> ${details.visitorOrganization}</p>
      <p><b>Purpose of Visit:</b> ${details.reasonOfVisit?.name}</p>
      <p><b>Date and Time of Request:</b> ${this.formatDate(details.createdAt)}</p>

      <p>
        Please review the visit request and choose to accept or reject it using the link below:
      </p>

      <p style="margin: 20px 0;">
        <a
          href="https://vms.seguevisit.com/notifications"
          style="
            background-color: #2563eb;
            color: #ffffff;
            padding: 10px 16px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          "
        >
          Review Visit Request
        </a>
      </p>

      <p>Thank you.</p>

      <p>${details.organization?.name || 'Our Company'} Security Team</p>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async VisitRequestToVisitor(details: any) {
    const formattedTime = this.formatDate(details.createdAt);

    const mailOptions = {
      from: '"Visit Request Submitted" <notifications@mail.seguevisit.com>',
      to: details.email,
      subject: `Your visit request to ${details.organization?.name} has been sent`,
      html: `
      <p>Dear ${details.fullName},</p>

      <p>Your visit request has been successfully submitted. Here are the details:</p>

      <p><b>Host Name:</b> ${details.staff?.name}</p>
      <p><b>Email:</b> ${details.staff?.email}</p>
      <p><b>Designation:</b> ${details.staff?.designation || 'N/A'}</p>
      <p><b>Department:</b> ${details.staff?.department?.name || 'Not Assigned'}</p>
      <p><b>Date and Time of Request:</b> ${this.formatDate(details.createdAt)}</p>

      <p>
        Once your host approves the visit, you will receive another email with further instructions.
      </p>

      <p>Thank you for your interest.</p>

      <p>${details.organization?.name || 'Our Company'} Reception Team</p>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
