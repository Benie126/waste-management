import { env } from '../config/env';

/**
 * Email delivery is intentionally kept behind a tiny interface so RabbitMQ can
 * drive it later. When EMAIL_ENABLED=false (the default for local development)
 * messages are logged instead of sent, which keeps the project runnable
 * without SMTP credentials.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!env.email.enabled) {
    console.log(`[email:disabled] to=${to} subject="${subject}"`);
    return;
  }
  // A real transport (nodemailer) can be plugged in here without changing callers.
  console.log(`[email] would send to=${to} subject="${subject}" body="${body}"`);
}
