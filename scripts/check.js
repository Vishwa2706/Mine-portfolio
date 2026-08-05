const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "build", "index.html");
if (!fs.existsSync(htmlPath)) throw new Error("Run npm run build before npm run check.");

const html = fs.readFileSync(htmlPath, "utf8");
const requiredIds = ["about", "experience", "work", "skills", "contact"];
const failures = [];
requiredIds.forEach((id) => {
  if (!html.includes(`id=\"${id}\"`)) failures.push(`Missing section #${id}`);
  if (!html.includes(`href=\"#${id}\"`)) failures.push(`Missing navigation link #${id}`);
});

const forbidden = ["Jack" + " Gross", "U" + "I8", "Flut" + "ter", "Da" + "rt", "React" + " Native", "VISHWA" + " LLC", "YouTube" + " clone", "Amazon" + " clone"];
forbidden.forEach((term) => {
  if (html.toLowerCase().includes(term.toLowerCase())) failures.push(`Outdated content remains: ${term}`);
});

if (!html.includes("href=\"resume/Vishwa-S-Resume.pdf\"")) failures.push("Resume target is missing");
[
  "mailto:vishwajayanth3@gmail.com",
  "tel:+919345321016",
  "https://github.com/Vishwa2706",
  "https://www.linkedin.com/in/vishwa-settu/"
].forEach((href) => {
  if (!html.includes(`href=\"${href}\"`)) failures.push(`Missing contact link: ${href}`);
});
if (html.includes("href=\"#\"")) failures.push("Empty hash link remains");
if (!html.includes("target=\"_blank\" rel=\"noopener noreferrer\"")) failures.push("External-link safety attributes are missing");
function mockResponse() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

async function checkContactEndpoint() {
  const contact = require(path.join(root, "api", "contact.js"));
  const methodResponse = mockResponse();
  await contact({ method: "GET" }, methodResponse);
  if (methodResponse.statusCode !== 405) failures.push("Contact API did not reject a non-POST request");

  const invalidResponse = mockResponse();
  await contact({ method: "POST", body: { name: "A" } }, invalidResponse);
  if (invalidResponse.statusCode !== 400) failures.push("Contact API accepted invalid input");

  const honeypotResponse = mockResponse();
  await contact({ method: "POST", body: { companyWebsite: "spam.example" } }, honeypotResponse);
  if (honeypotResponse.statusCode !== 200) failures.push("Contact API honeypot handling failed");

  const previousFetch = global.fetch;
  const previousEnvironment = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL
  };
  let providerPayload;
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_TO_EMAIL = "destination@example.com";
  process.env.CONTACT_FROM_EMAIL = "Portfolio <sender@example.com>";
  global.fetch = async (url, options) => {
    providerPayload = { url, body: JSON.parse(options.body) };
    return { ok: true };
  };
  const successResponse = mockResponse();
  await contact({ method: "POST", body: { name: "Test User", email: "person@example.com", subject: "Project enquiry", message: "A sufficiently long test message." } }, successResponse);
  if (successResponse.statusCode !== 200 || providerPayload?.body?.reply_to !== "person@example.com") failures.push("Contact API provider request failed");

  global.fetch = previousFetch;
  Object.entries(previousEnvironment).forEach(([name, value]) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  });
}

(async () => {
  await checkContactEndpoint();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Portfolio content, navigation, resume target, and contact API checks passed.");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
