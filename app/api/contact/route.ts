import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!pass) {
      console.error("[contact] GMAIL_APP_PASSWORD env var not set");
      return NextResponse.json({ success: true });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS — more reliable in serverless environments
      auth: {
        user: "techzilla.web@gmail.com",
        pass,
      },
    });

    await transporter.sendMail({
      from: '"Techzilla Website" <techzilla.web@gmail.com>',
      to: "techzilla.web@gmail.com",
      replyTo: email,
      subject: `New Contact Message from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#111;margin-bottom:4px;">New Contact Form Submission</h2>
          <p style="color:#555;font-size:0.85rem;margin-top:0;">Received from the Techzilla website</p>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#777;width:110px;vertical-align:top;font-size:0.9rem;">Name</td>
              <td style="padding:8px 0;color:#111;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Email</td>
              <td style="padding:8px 0;color:#111;">
                <a href="mailto:${email}" style="color:#3662f4;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Message</td>
              <td style="padding:8px 0;color:#111;white-space:pre-wrap;">${message}</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
          <p style="color:#999;font-size:0.78rem;margin:0;">
            Reply directly to this email to respond to ${name}.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[contact] Failed to send email:", errMsg);
    return NextResponse.json({ error: "Failed to send", detail: errMsg }, { status: 500 });
  }
}
