import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_NEXT_PUBLIC_API_KEY);

/**
 * Sends an OTP code to the user's email with proper formatting using Resend
 * @param {string} userEmail - The recipient's email address
 * @param {string} otp - The one-time password to send
 * @returns {Promise<void>}
 */
export default async function sendOtpEmail(userEmail, otp) {
  const companyName = process.env.COMPANY_NAME || "Scofist";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verification Code</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          padding: 20px;
          max-width: 600px;
          margin: auto;
        }
        .container {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 20px;
          background: #f9f9f9;
        }
        .code {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 15px;
          background: #f1f1f1;
          border-radius: 6px;
          margin: 20px 0;
          letter-spacing: 4px;
        }
        .footer {
          font-size: 12px;
          color: #888;
          text-align: center;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${companyName} Verification Code</h2>
        <p>Hello,</p>
        <p>Your OTP for ${companyName} is:</p>
        <div class="code">${otp}</div>
        <p>This code is valid for 5 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await resend.emails.send({
      from: `noreply@scofist.com`,
      to: userEmail,
      subject: `${otp} is your verification code`,
      html: htmlContent,
    });

    console.log("Email sent via Resend:", response.id || response);
    return response;
  } catch (error) {
    console.error("Resend email error:", error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
