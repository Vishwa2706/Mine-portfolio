const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async function contact(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const name = clean(request.body?.name);
  const email = clean(request.body?.email);
  const subject = clean(request.body?.subject);
  const message = clean(request.body?.message);
  const companyWebsite = clean(request.body?.companyWebsite);

  if (companyWebsite) return response.status(200).json({ ok: true });
  if (name.length < 2 || name.length > 80 || !EMAIL_PATTERN.test(email) || email.length > 254 || subject.length < 3 || subject.length > 120 || message.length < 10 || message.length > 3000) {
    return response.status(400).json({ error: "Please check the submitted fields." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    return response.status(503).json({ error: "Contact service is not configured." });
  }

  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Portfolio enquiry: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`
      })
    });

    if (!providerResponse.ok) throw new Error("Email provider rejected the request.");
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(502).json({ error: "Message delivery failed." });
  }
};
