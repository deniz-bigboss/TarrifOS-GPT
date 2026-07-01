export type EmailProvider = {
  sendImportantEmail(input: { to: string; subject: string; text: string }): Promise<void>;
};

export class MockEmailProvider implements EmailProvider {
  async sendImportantEmail() {
    return;
  }
}

export class ResendEmailProvider implements EmailProvider {
  async sendImportantEmail(input: { to: string; subject: string; text: string }) {
    if (!process.env.RESEND_API_KEY) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "TariffOS <notifications@tariffos.local>",
        ...input
      })
    }).catch(() => undefined);
  }
}

export function getEmailProvider(): EmailProvider {
  return process.env.RESEND_API_KEY ? new ResendEmailProvider() : new MockEmailProvider();
}
