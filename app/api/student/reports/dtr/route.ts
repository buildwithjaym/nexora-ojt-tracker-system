import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

function parseMonthYear(searchParams: URLSearchParams) {
  const month = Number(searchParams.get("month") || "");
  const year = Number(searchParams.get("year") || "");

  if (!month || !year || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return null;
  }

  return { month, year };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });
}

function formatTime(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getHoursMinutes(totalSeconds: number) {
  const hours = Math.floor((totalSeconds || 0) / 3600);
  const minutes = Math.floor(((totalSeconds || 0) % 3600) / 60);

  return { hours, minutes };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseMonthYear(req.nextUrl.searchParams);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }

  const { month, year } = parsed;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || !profile.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, middle_name, last_name, suffix, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const fullName = [
    student.first_name,
    student.middle_name,
    student.last_name,
    student.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    daysInMonth(year, month)
  ).padStart(2, "0")}`;

  const { data: logs } = await supabase
    .from("attendance_days")
    .select(`
      attendance_date,
      am_in_at,
      am_out_at,
      pm_in_at,
      pm_out_at,
      total_work_seconds
    `)
    .eq("student_id", student.id)
    .gte("attendance_date", monthStart)
    .lte("attendance_date", monthEnd)
    .order("attendance_date", { ascending: true });

  const logsByDate = new Map<string, any>();
  for (const log of logs ?? []) {
    logsByDate.set(log.attendance_date, log);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 936]); // 8.5 x 13 inches

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const width = page.getWidth();
  const height = page.getHeight();
  const black = rgb(0, 0, 0);

  function useFont(type: "regular" | "bold" | "italic") {
    if (type === "bold") return bold;
    if (type === "italic") return italic;
    return font;
  }

  function drawText(
    text: string,
    x: number,
    y: number,
    size = 9,
    type: "regular" | "bold" | "italic" = "regular"
  ) {
    page.drawText(text, {
      x,
      y,
      size,
      font: useFont(type),
      color: black,
    });
  }

  function drawCenteredText(
    text: string,
    centerX: number,
    y: number,
    size = 9,
    type: "regular" | "bold" | "italic" = "regular"
  ) {
    const selected = useFont(type);
    const textWidth = selected.widthOfTextAtSize(text, size);

    page.drawText(text, {
      x: centerX - textWidth / 2,
      y,
      size,
      font: selected,
      color: black,
    });
  }

  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness = 0.8
  ) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: black,
    });
  }

  function drawTextCenterInCell(
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 8,
    type: "regular" | "bold" | "italic" = "regular"
  ) {
    const selected = useFont(type);
    const textWidth = selected.widthOfTextAtSize(text, size);

    page.drawText(text, {
      x: x + (w - textWidth) / 2,
      y: y + (h - size) / 2 + 1,
      size,
      font: selected,
      color: black,
    });
  }

  const left = 34;
  const right = width - 34;

  drawText("Civil Service Form No. 48", left, height - 22, 7, "italic");
  drawCenteredText("DAILY TIME RECORD", width / 2, height - 45, 14, "bold");
  drawLine(width / 2 - 42, height - 50, width / 2 + 42, height - 50, 0.7);

  const nameLineY = height - 84;
  drawLine(left + 125, nameLineY, right - 10, nameLineY, 0.7);
  drawCenteredText(fullName, width / 2 + 20, nameLineY + 3, 8.5, "regular");
  drawCenteredText("(Name)", width / 2, nameLineY - 11, 7, "italic");

  const metaY = height - 108;
  drawText("For the month of", left, metaY, 7.5, "italic");
  drawLine(left + 68, metaY - 1, left + 186, metaY - 1, 0.7);
  drawText(monthName(month), left + 92, metaY + 2, 7.5);

  drawText("20", left + 198, metaY, 7.5, "italic");
  drawLine(left + 212, metaY - 1, left + 262, metaY - 1, 0.7);
  drawText(String(year), left + 222, metaY + 2, 7.5);

  drawText("Official hours of arrival", left, metaY - 15, 7.5, "italic");
  drawText("and departure", left + 22, metaY - 28, 7.5, "italic");

  drawText("Regular Days", left + 225, metaY - 15, 7.5, "italic");
  drawLine(left + 195, metaY - 18, left + 305, metaY - 18, 0.7);

  drawText("Saturdays", left + 232, metaY - 28, 7.5, "italic");
  drawLine(left + 195, metaY - 31, left + 305, metaY - 31, 0.7);

  const tableTop = height - 150;
  const header1H = 17;
  const header2H = 20;
  const rowH = 18;
  const totalH = 18;

  const dayW = 28;
  const amInW = 72;
  const amOutW = 72;
  const pmInW = 72;
  const pmOutW = 72;
  const hoursW = 46;
  const minutesW = 46;

  const x0 = left;
  const x1 = x0 + dayW;
  const x2 = x1 + amInW;
  const x3 = x2 + amOutW;
  const x4 = x3 + pmInW;
  const x5 = x4 + pmOutW;
  const x6 = x5 + hoursW;
  const x7 = x6 + minutesW;

  const topY = tableTop;
  const header1Bottom = topY - header1H;
  const header2Bottom = header1Bottom - header2H;
  const bodyBottom = header2Bottom - rowH * 31;
  const totalBottom = bodyBottom - totalH;

  drawLine(x0, topY, x7, topY, 0.9);
  drawLine(x0, header1Bottom, x7, header1Bottom, 0.7);
  drawLine(x0, header2Bottom, x7, header2Bottom, 0.7);
  drawLine(x0, bodyBottom, x7, bodyBottom, 0.7);
  drawLine(x0, totalBottom, x7, totalBottom, 0.9);

  drawLine(x0, topY, x0, totalBottom, 0.8);
  drawLine(x1, topY, x1, totalBottom, 0.7);
  drawLine(x2, topY, x2, totalBottom, 0.7);
  drawLine(x3, topY, x3, totalBottom, 0.7);
  drawLine(x4, topY, x4, totalBottom, 0.7);
  drawLine(x5, topY, x5, totalBottom, 0.7);
  drawLine(x6, header1Bottom, x6, totalBottom, 0.7);
  drawLine(x7, topY, x7, totalBottom, 0.8);

  drawTextCenterInCell("Days", x0, header2Bottom, dayW, header1H + header2H, 7.5, "bold");
  drawTextCenterInCell("A. M.", x1, header1Bottom, amInW + amOutW, header1H, 7.5, "bold");
  drawTextCenterInCell("P. M.", x3, header1Bottom, pmInW + pmOutW, header1H, 7.5, "bold");
  drawTextCenterInCell("UNDER", x5, header1Bottom + 8, hoursW + minutesW, 8, 7, "bold");
  drawTextCenterInCell("TIME", x5, header1Bottom, hoursW + minutesW, 8, 7, "bold");

  drawTextCenterInCell("ARRIVAL", x1, header2Bottom, amInW, header2H, 6, "bold");
  drawTextCenterInCell("DEPARTURE", x2, header2Bottom, amOutW, header2H, 6, "bold");
  drawTextCenterInCell("ARRIVAL", x3, header2Bottom, pmInW, header2H, 6, "bold");
  drawTextCenterInCell("DEPARTURE", x4, header2Bottom, pmOutW, header2H, 6, "bold");
  drawTextCenterInCell("Hours", x5, header2Bottom, hoursW, header2H, 6, "bold");
  drawTextCenterInCell("Minutes", x6, header2Bottom, minutesW, header2H, 6, "bold");

  for (let i = 1; i <= 31; i++) {
    const y = header2Bottom - i * rowH;
    drawLine(x0, y, x7, y, 0.45);
  }

  let totalHours = 0;
  let totalMinutes = 0;
  const actualDays = daysInMonth(year, month);

  for (let day = 1; day <= 31; day++) {
    const rowTop = header2Bottom - (day - 1) * rowH;
    const rowBottom = rowTop - rowH;
    const textY = rowBottom + 5.5;

    drawText(String(day), x0 + 9, textY, 7.2);

    if (day > actualDays) continue;

    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const log = logsByDate.get(dateKey);

    if (!log) continue;

    const hm = getHoursMinutes(Number(log.total_work_seconds ?? 0));
    totalHours += hm.hours;
    totalMinutes += hm.minutes;

    drawText(formatTime(log.am_in_at), x1 + 16, textY, 7);
    drawText(formatTime(log.am_out_at), x2 + 16, textY, 7);
    drawText(formatTime(log.pm_in_at), x3 + 16, textY, 7);
    drawText(formatTime(log.pm_out_at), x4 + 16, textY, 7);
    drawText(String(hm.hours), x5 + 16, textY, 7);
    drawText(String(hm.minutes), x6 + 14, textY, 7);
  }

  totalHours += Math.floor(totalMinutes / 60);
  totalMinutes = totalMinutes % 60;

  drawTextCenterInCell(
    "TOTAL",
    x0,
    totalBottom,
    dayW + amInW + amOutW + pmInW + pmOutW,
    totalH,
    7,
    "bold"
  );
  drawTextCenterInCell(String(totalHours), x5, totalBottom, hoursW, totalH, 7, "bold");
  drawTextCenterInCell(
    String(totalMinutes),
    x6,
    totalBottom,
    minutesW,
    totalH,
    7,
    "bold"
  );

  const certY = 104;
  drawText(
    "I CERTIFY on my honor that the above is a true and correct",
    left + 3,
    certY,
    6.5,
    "italic"
  );
  drawText(
    "report of the hours of work performed, record of which was made",
    left + 3,
    certY - 9,
    6.5,
    "italic"
  );
  drawText(
    "daily at the time of arrival and departure from office.",
    left + 3,
    certY - 18,
    6.5,
    "italic"
  );

  const sigLineY = 44;
  drawLine(width - 200, sigLineY + 12, width - 48, sigLineY + 12, 0.7);
  drawText("In-Charge", width - 96, sigLineY, 7.5, "italic");
  drawText("(See Instructions on back)", width - 155, sigLineY - 12, 5.8);

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dtr-${year}-${String(month).padStart(
        2,
        "0"
      )}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}