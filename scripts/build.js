const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const pug = require("pug");
const sass = require("sass");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "src");
const output = path.join(root, "public");
const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copyDirectory(from, to, filter = () => true) {
  ensureDirectory(to);
  fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(from, entry.name);
    const outputPath = path.join(to, entry.name);
    if (!filter(sourcePath, entry)) return;
    if (entry.isDirectory()) copyDirectory(sourcePath, outputPath, filter);
    else fs.copyFileSync(sourcePath, outputPath);
  });
}

function build() {
  fs.rmSync(output, { recursive: true, force: true });
  ensureDirectory(output);

  const html = pug.renderFile(path.join(source, "templates", "index.pug"), {
    filename: path.join(source, "templates", "index.pug"),
    pretty: !production,
    title: "Vishwa S | Angular & ASP.NET Core Software Developer"
  });
  fs.writeFileSync(path.join(output, "index.html"), html);

  const css = sass.compile(path.join(source, "sass", "app.sass"), {
    style: production ? "compressed" : "expanded",
    loadPaths: [path.join(source, "sass")],
    silenceDeprecations: ["import", "slash-div", "global-builtin"]
  });
  ensureDirectory(path.join(output, "css"));
  fs.writeFileSync(path.join(output, "css", "app.css"), css.css);

  copyDirectory(path.join(source, "img"), path.join(output, "img"), (filePath) => {
    return !/android-chrome/i.test(filePath);
  });
  copyDirectory(path.join(source, "js"), path.join(output, "js"), (filePath, entry) => {
    if (entry.isDirectory()) return true;
    return ["common.js", "aos.js", "simpleParallax.min.js"].includes(entry.name);
  });
  const resumeSource = path.join(source, "resume", "Vishwa-S-Resume.pdf");
  if (fs.existsSync(resumeSource)) {
    ensureDirectory(path.join(output, "resume"));
    fs.copyFileSync(resumeSource, path.join(output, "resume", "Vishwa-S-Resume.pdf"));
  }

  console.log(`Built portfolio in ${production ? "production" : "development"} mode.`);
}

build();

if (watch) {
  let timer;
  fs.watch(source, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (error) {
        console.error(error.message);
      }
    }, 120);
  });
  http.createServer((request, response) => {
    const requestPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
    const resolvedPath = path.resolve(output, `.${decodeURIComponent(requestPath)}`);
    if (!resolvedPath.startsWith(output) || !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
      response.writeHead(404);
      return response.end("Not found");
    }
    const extensions = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
    response.writeHead(200, { "Content-Type": extensions[path.extname(resolvedPath)] || "application/octet-stream" });
    fs.createReadStream(resolvedPath).pipe(response);
  }).listen(3000, () => console.log("Development server: http://localhost:3000"));
}
