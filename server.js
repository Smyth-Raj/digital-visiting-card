// server.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const qr = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.set("view engine", "ejs");

const users = {};
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
const QR_DIR = path.join(__dirname, "public", "qr");

[UPLOADS_DIR, QR_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/qr", express.static(QR_DIR));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.render("form");
});

app.post("/submit", upload.single("photo"), async (req, res) => {
  const id = uuidv4();
  const { name, phone, email, company } = req.body;
  const photo = req.file ? req.file.filename : null;

  // ✅ Dynamic URL (local or Render/Heroku etc.)
  const protocol = req.protocol;
  const host = req.get("host");
  const dataUrl = `${protocol}://${host}/card/${id}`;

  const qrFile = `${id}.png`;
  const qrPath = path.join(QR_DIR, qrFile);

  await qr.toFile(qrPath, dataUrl);

  users[id] = { name, phone, email, company, photo, views: 0 };
  res.render("success", { qrFile, id, host });
});

app.get("/card/:id", (req, res) => {
    const user = users[req.params.id];
    if (!user) return res.status(404).send("Card not found");
    user.views++;
  
    const host = req.get('host');
    res.render("card", { user, id: req.params.id, host });
  });
app.get("/vcf/:id", (req, res) => {
  const user = users[req.params.id];
  if (!user) return res.status(404).send("User not found");

  const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${user.name}\nTEL:${user.phone}\nEMAIL:${user.email}\nORG:${user.company}\nEND:VCARD`;

  res.setHeader("Content-Type", "text/vcard");
  res.setHeader("Content-Disposition", `attachment; filename=${user.name.replace(/\s/g, "_")}.vcf`);
  res.send(vcf);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
