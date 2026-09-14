import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: ENV.smtpHost,
  port: ENV.smtpPort,
  secure: ENV.smtpPort === 465,
  auth: {
    user: ENV.smtpUser,
    pass: ENV.smtpPass,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!ENV.smtpUser || !ENV.smtpPass) {
    console.warn("[Email] SMTP not configured, skipping email to:", to);
    return;
  }
  await transporter.sendMail({
    from: ENV.smtpFrom,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  await sendEmail(to, "Your Password Reset Code", `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Use the code below to continue — it expires in 10 minutes:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f3f4f6; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 16px 0;">${otp}</div>
      <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `);
}

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${ENV.corsOrigins[0]}/verify-email?token=${token}`;
  await sendEmail(to, "Verify Your Email", `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Welcome! Please verify your email address:</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Verify Email</a>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
    </div>
  `);
}
