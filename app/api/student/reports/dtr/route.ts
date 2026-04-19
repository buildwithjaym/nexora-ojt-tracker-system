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
  return {
    hours: String(hours),
    minutes: String(minutes),
  };
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
  const page = pdfDoc.addPage([612, 936]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const width = page.getWidth();
  const height = page.getHeight();

  function drawText(
    text: string,
    x: number,
    y: number,
    size = 9,
    useBold = false
  ) {
    page.drawText(text, {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number, thickness = 1) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: rgb(0, 0, 0),
    });
  }

  drawText("Civil Service Form No. 48", 40, height - 30, 8);
  drawText("DAILY TIME RECORD", 225, height - 50, 16, true);

  drawText(`Name: ${fullName}`, 40, height - 90, 10);
  drawText(`For the month of ${monthStart.slice(0, 7)}`, 40, height - 108, 10);

  const tableTop = height - 150;
  const rowHeight = 20;

  const colX = {
    day: 40,
    amIn: 90,
    amOut: 150,
    pmIn: 220,
    pmOut: 280,
    hours: 350,
    minutes: 420,
  };

  drawText("Day", colX.day, tableTop + 8, 9, true);
  drawText("A.M. In", colX.amIn, tableTop + 8, 9, true);
  drawText("A.M. Out", colX.amOut, tableTop + 8, 9, true);
  drawText("P.M. In", colX.pmIn, tableTop + 8, 9, true);
  drawText("P.M. Out", colX.pmOut, tableTop + 8, 9, true);
  drawText("Hours", colX.hours, tableTop + 8, 9, true);
  drawText("Minutes", colX.minutes, tableTop + 8, 9, true);

  drawLine(35, tableTop, 560, tableTop, 1.2);

  const totalDays = daysInMonth(year, month);

  for (let day = 1; day <= 31; day++) {
    const y = tableTop - day * rowHeight;

    drawLine(35, y, 560, y, 0.6);

    drawText(String(day), colX.day, y + 6, 9);

    if (day <= totalDays) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;

      const log = logsByDate.get(dateKey);
      if (log) {
        const hm = getHoursMinutes(Number(log.total_work_seconds ?? 0));

        drawText(formatTime(log.am_in_at), colX.amIn, y + 6, 9);
        drawText(formatTime(log.am_out_at), colX.amOut, y + 6, 9);
        drawText(formatTime(log.pm_in_at), colX.pmIn, y + 6, 9);
        drawText(formatTime(log.pm_out_at), colX.pmOut, y + 6, 9);
        drawText(hm.hours, colX.hours, y + 6, 9);
        drawText(hm.minutes, colX.minutes, y + 6, 9);
      }
    }
  }

  drawLine(35, tableTop - 31 * rowHeight - 10, 560, tableTop - 31 * rowHeight - 10, 1.2);

  drawText(
    "I certify on my honor that the above is a true and correct report of the hours of work performed.",
    40,
    115,
    8
  );

  drawText("In-Charge", 420, 55, 10, true);
  drawLine(360, 70, 540, 70, 1);

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dtr-${year}-${String(month).padStart(
        2,
        "0"
      )}.pdf"`,
    },
  });
}