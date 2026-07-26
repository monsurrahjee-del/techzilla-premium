import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { businessName, discountCode, characterName, characterLabel } =
      await req.json();

    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!pass) {
      console.error("[gift] GMAIL_APP_PASSWORD env var not set");
      return NextResponse.json({ success: true });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "techzilla.web@gmail.com",
        pass,
      },
    });

    const now = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "short",
    });

    await transporter.sendMail({
      from: '"Techzilla Website" <techzilla.web@gmail.com>',
      to: "techzilla.web@gmail.com",
      subject: `🎁 New Gift Card Generated — ${businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#111;margin-bottom:4px;">🎁 New Gift Card Created</h2>
          <p style="color:#555;font-size:0.85rem;margin-top:0;">A visitor has generated a personalised gift card on the Techzilla website.</p>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#777;width:140px;vertical-align:top;font-size:0.9rem;">Business Name</td>
              <td style="padding:8px 0;color:#111;font-weight:600;">${businessName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Discount Code</td>
              <td style="padding:8px 0;color:#3662f4;font-weight:700;font-family:monospace;font-size:1rem;">${discountCode}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Discount Value</td>
              <td style="padding:8px 0;color:#111;">5% off first project</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Card Character</td>
              <td style="padding:8px 0;color:#111;">${characterName} (${characterLabel})</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#777;vertical-align:top;font-size:0.9rem;">Generated At</td>
              <td style="padding:8px 0;color:#111;">${now} UTC</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
          <p style="color:#999;font-size:0.78rem;margin:0;">
            This is an automated notification from the Techzilla website gift flow.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gift] Failed to send notification:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
