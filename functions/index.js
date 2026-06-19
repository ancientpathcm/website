import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
const notifyTo = "info@ancientpathcm.org";
const notifyFrom = "Ancient Path Creative Ministries <notifications@ancientpathcm.org>";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value = "") {
  return String(value).trim().slice(0, 5000);
}

export const sendContactSubmissionEmail = onDocumentCreated(
  {
    document: "contactSubmissions/{submissionId}",
    region: "us-central1",
    secrets: [resendApiKey]
  },
  async (event) => {
    const data = event.data?.data();

    if (!data) {
      logger.warn("Contact submission email skipped: missing document data.");
      return;
    }

    const name = cleanText(data.name);
    const email = cleanText(data.email);
    const organization = cleanText(data.organization);
    const message = cleanText(data.message);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey.value()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: notifyFrom,
        to: notifyTo,
        reply_to: email,
        subject: `New APCM contact form message from ${name}`,
        text: [
          "New contact form submission",
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `Organization: ${organization || "N/A"}`,
          "",
          "Message:",
          message
        ].join("\n"),
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Organization:</strong> ${escapeHtml(organization || "N/A")}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
        `
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Resend email request failed.", {
        status: response.status,
        body: errorBody
      });
      throw new Error(`Resend request failed with status ${response.status}`);
    }

    logger.info("Contact submission email sent.", {
      submissionId: event.params.submissionId
    });
  }
);
