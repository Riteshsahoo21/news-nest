import 'dotenv/config';
import nodemailer from 'nodemailer';

async function test() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: '"News Nests" <newsletter@newsnests.com>', // We suspect this is causing the issue
      to: "test@example.com",
      subject: "Test",
      text: "Test",
    });
    console.log("Success:", info.messageId);
  } catch (error) {
    console.error("Failure:", error.message || error);
  }
}
test();
