const PDFDocument = require("pdfkit");

// Strip control characters and truncate to prevent PDF layout injection via user content
function sanitizePdfText(s) {
  return String(s ?? "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .substring(0, 200);
}

function streamTimesheetPdf(res, sheet, entries, threshold) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  const safeName = (sheet.worker_name || "timesheet")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const safeWeekStart = String(sheet.week_start).replace(/[^\d-]/g, "");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="timesheet-${safeName}-${safeWeekStart}.pdf"`,
  );
  doc.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: "PDF generation failed" });
    } else {
      res.destroy(err);
    }
  });
  doc.pipe(res);

  // Title
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("GIPS Timesheet", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Worker: ${sheet.worker_name || "—"}`, { align: "center" });

  const weekEnd = (() => {
    const d = new Date(sheet.week_start + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().substring(0, 10);
  })();
  doc.text(`Week: ${sheet.week_start} – ${weekEnd}`, { align: "center" });
  doc.text(`Status: ${sheet.status.toUpperCase()}`, { align: "center" });
  if (sheet.reviewed_at)
    doc.text(`Reviewed: ${new Date(sheet.reviewed_at).toDateString()}`, {
      align: "center",
    });
  doc.moveDown();

  // Table header
  const cols = [55, 110, 75, 65, 100, 75, 80];
  const headers = [
    "Date",
    "Day",
    "Present",
    "Hours",
    "Work Type",
    "OT Hours",
    "Notes",
  ];
  let y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  let x = 50;
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: cols[i] });
    x += cols[i];
  });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.2);

  // Table rows
  doc.font("Helvetica").fontSize(9);
  let totalHours = 0,
    presentDays = 0,
    totalOt = 0;
  for (const e of entries) {
    const date = new Date(String(e.date).substring(0, 10) + "T00:00:00Z");
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      date.getUTCDay()
    ];
    const hours = e.is_present && e.hours ? parseFloat(e.hours) : 0;
    const ot = Math.max(0, hours - threshold);
    if (e.is_present) {
      totalHours += hours;
      presentDays++;
      totalOt += ot;
    }
    x = 50;
    y = doc.y;
    const row = [
      String(e.date).substring(0, 10),
      dayName,
      e.is_present ? "Yes" : "No",
      e.is_present && e.hours ? `${hours}h` : "—",
      e.work_type || "—",
      ot > 0 ? `${ot.toFixed(1)}h` : "—",
      sanitizePdfText(e.notes),
    ];
    row.forEach((v, i) => {
      doc.text(String(v), x, y, { width: cols[i] });
      x += cols[i];
    });
    doc.moveDown(0.3);
  }

  // Totals
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(
    `Present: ${presentDays} days   Total Hours: ${totalHours}h   Overtime Hours: ${totalOt.toFixed(1)}h`,
    50,
  );

  if (sheet.admin_note) {
    doc.moveDown();
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Admin note: ${sanitizePdfText(sheet.admin_note)}`);
  }

  doc.end();
}

module.exports = { streamTimesheetPdf };
