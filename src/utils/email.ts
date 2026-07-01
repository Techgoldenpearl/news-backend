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

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${ENV.corsOrigins[0]}/reset-password?token=${token}`;
  await sendEmail(to, "Reset Your Password", `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
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
