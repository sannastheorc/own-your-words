// SEEDSED — certificate.js
// Purpose: draws a dated certificate as a picture, right on the phone with no internet, then hands it to
//          the phone's share menu (print, text, save) or downloads it where sharing isn't available.
// Boundaries: output only. Prints only what it is given: name, achievement and the date it happened.

export function prettyDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Letter-paper landscape, on a white ground so it prints well.
export function drawCertificate(canvas, { name, title, detail, on, stats }) {
  const W = 1650, H = 1275;
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d");
  const INK = "#16201D", PINE = "#0F6B5C", GOLD = "#B98510", FONT = "Georgia, 'Times New Roman', serif";
  c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H);
  c.strokeStyle = PINE; c.lineWidth = 16; c.strokeRect(50, 50, W - 100, H - 100);
  c.strokeStyle = GOLD; c.lineWidth = 4; c.strokeRect(78, 78, W - 156, H - 156);
  c.textAlign = "center"; c.textBaseline = "alphabetic";
  c.fillStyle = PINE; c.font = `600 44px ${FONT}`; c.fillText("OWN YOUR WORDS", W / 2, 210);
  c.fillStyle = INK; c.font = `700 100px ${FONT}`; c.fillText("Certificate of Achievement", W / 2, 350);
  c.font = `400 42px ${FONT}`; c.fillText("This certifies that", W / 2, 470);
  c.fillStyle = PINE; c.font = `700 92px ${FONT}`; c.fillText(name || "This Learner", W / 2, 590);
  c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2 - 400, 620); c.lineTo(W / 2 + 400, 620); c.stroke();
  c.fillStyle = INK; c.font = `400 42px ${FONT}`; c.fillText(`has earned: ${title}`, W / 2, 700);
  c.font = `700 56px ${FONT}`;
  wrap(c, detail, W - 360).slice(0, 3).forEach((l, i) => c.fillText(l, W / 2, 790 + i * 72));
  if (stats) { c.font = `400 34px ${FONT}`; c.fillText(stats, W / 2, 1000); }
  c.fillStyle = PINE; c.font = `700 44px ${FONT}`; c.fillText(prettyDate(on), W / 2, 1095);
  return canvas;
}

export function certificateBlob(cert) {
  const canvas = drawCertificate(document.createElement("canvas"), cert);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Couldn't draw the certificate"))), "image/png"));
}

// Share menu where available (it offers Print, Messages, Save); otherwise a download.
export async function shareCertificate(cert) {
  const blob = await certificateBlob(cert);
  const file = new File([blob], `certificate-${cert.on}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: cert.title }); return "shared"; } catch (e) { if (e.name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
