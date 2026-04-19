"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AttendanceResult =
  | {
      success: true;
      message: string;
      serverTime: string;
      distanceMeters: number;
      eventType: "am_in" | "am_out" | "pm_in" | "pm_out";
    }
  | {
      success: false;
      message: string;
    };

type EventType = "am_in" | "am_out" | "pm_in" | "pm_out";

/**
 * Time rules in Manila time
 *
 * Morning:
 * - Time in starts at 6:00 AM
 * - Morning actions end at 12:29 PM
 *
 * Afternoon:
 * - Time in starts at 12:50 PM
 * - PM time in closes at 5:00 PM
 * - PM time out can continue until 6:00 PM
 */
const MORNING_START = 6 * 60;
const MORNING_END = 12 * 60 + 29;

const AFTERNOON_IN_START = 22 * 60;
const AFTERNOON_IN_END = 23 * 60 + 50;
const AFTERNOON_OUT_END = 23 * 60 + 59;

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getManilaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

function getReadableManilaTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function toNumber(value: FormDataEntryValue | null) {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function getEventColumnMap(eventType: EventType) {
  switch (eventType) {
    case "am_in":
      return {
        timeCol: "am_in_at",
        photoCol: "am_in_photo_url",
        latCol: "am_in_latitude",
        lngCol: "am_in_longitude",
        accuracyCol: "am_in_accuracy_meters",
        distanceCol: "am_in_distance_meters",
        summaryCol: "am_activity_summary",
      };
    case "am_out":
      return {
        timeCol: "am_out_at",
        photoCol: "am_out_photo_url",
        latCol: "am_out_latitude",
        lngCol: "am_out_longitude",
        accuracyCol: "am_out_accuracy_meters",
        distanceCol: "am_out_distance_meters",
        summaryCol: "am_activity_summary",
      };
    case "pm_in":
      return {
        timeCol: "pm_in_at",
        photoCol: "pm_in_photo_url",
        latCol: "pm_in_latitude",
        lngCol: "pm_in_longitude",
        accuracyCol: "pm_in_accuracy_meters",
        distanceCol: "pm_in_distance_meters",
        summaryCol: "pm_activity_summary",
      };
    case "pm_out":
      return {
        timeCol: "pm_out_at",
        photoCol: "pm_out_photo_url",
        latCol: "pm_out_latitude",
        lngCol: "pm_out_longitude",
        accuracyCol: "pm_out_accuracy_meters",
        distanceCol: "pm_out_distance_meters",
        summaryCol: "pm_activity_summary",
      };
  }
}

function getSecondsDiff(start: string | null, end: Date) {
  if (!start) return 0;
  const startDate = new Date(start);
  const diff = Math.floor((end.getTime() - startDate.getTime()) / 1000);
  return Math.max(diff, 0);
}

/**
 * Business logic:
 *
 * Morning:
 * - AM out requires AM in
 *
 * Afternoon:
 * - PM in is independent from morning
 * - PM out requires PM in
 */
function validateWindow(
  eventType: EventType,
  nowMinutes: number,
  attendanceDay: any
): string | null {
  if (eventType === "am_in") {
    if (attendanceDay?.am_in_at) {
      return "Morning time in has already been recorded.";
    }
    if (nowMinutes < MORNING_START || nowMinutes > MORNING_END) {
      return "Morning time in is only allowed from 6:00 AM to 12:29 PM.";
    }
    return null;
  }

  if (eventType === "am_out") {
    if (!attendanceDay?.am_in_at) {
      return "You must complete morning time in first.";
    }
    if (attendanceDay?.am_out_at) {
      return "Morning time out has already been recorded.";
    }
    if (nowMinutes < MORNING_START || nowMinutes > MORNING_END) {
      return "Morning time out is only allowed until 12:29 PM.";
    }
    return null;
  }

  if (eventType === "pm_in") {
    if (attendanceDay?.pm_in_at) {
      return "Afternoon time in has already been recorded.";
    }
    if (nowMinutes < AFTERNOON_IN_START || nowMinutes > AFTERNOON_IN_END) {
      return "Afternoon time in is only allowed from 12:50 PM to 5:00 PM.";
    }
    return null;
  }

  if (eventType === "pm_out") {
    if (!attendanceDay?.pm_in_at) {
      return "You must complete afternoon time in first.";
    }
    if (attendanceDay?.pm_out_at) {
      return "Afternoon time out has already been recorded.";
    }
    if (nowMinutes < AFTERNOON_IN_START || nowMinutes > AFTERNOON_OUT_END) {
      return "Afternoon time out is only allowed from 12:50 PM to 6:00 PM.";
    }
    return null;
  }

  return "Invalid attendance event.";
}

export async function recordAttendance(
  formData: FormData
): Promise<AttendanceResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Your session expired. Please log in again.",
    };
  }

  const eventTypeRaw = formData.get("event_type");
  const eventType =
    typeof eventTypeRaw === "string"
      ? (eventTypeRaw as EventType)
      : null;

  if (!eventType || !["am_in", "am_out", "pm_in", "pm_out"].includes(eventType)) {
    return { success: false, message: "Invalid attendance event." };
  }

  const latitude = toNumber(formData.get("latitude"));
  const longitude = toNumber(formData.get("longitude"));
  const accuracyMeters = toNumber(formData.get("accuracy_meters"));

  const activitySummary =
    typeof formData.get("activity_summary") === "string"
      ? formData.get("activity_summary")!.toString().trim()
      : "";

  const deviceInfoRaw =
    typeof formData.get("device_info") === "string"
      ? formData.get("device_info")!.toString()
      : null;

  const photo = formData.get("photo");
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;

  if (latitude === null || longitude === null) {
    return { success: false, message: "Location is required." };
  }

  if (!photoFile) {
    return { success: false, message: "A photo is required." };
  }

  if (!activitySummary) {
    return { success: false, message: "Please enter what you did." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (studentError || !student) {
    return { success: false, message: "Student account not found." };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select(`
      id,
      status,
      student_id,
      office_id,
      offices:office_id (
        id,
        name,
        latitude,
        longitude,
        allowed_radius_meters
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { success: false, message: "No active assignment found." };
  }

  const office = Array.isArray(assignment.offices)
    ? assignment.offices[0]
    : assignment.offices;

  if (!office || office.latitude == null || office.longitude == null) {
    return {
      success: false,
      message:
        "Assigned office location is incomplete. Please contact your administrator.",
    };
  }

  const maxDistance = Number(office.allowed_radius_meters ?? 50);
  const distanceMeters = haversineMeters(
    latitude,
    longitude,
    Number(office.latitude),
    Number(office.longitude)
  );

  if (distanceMeters > maxDistance) {
    return {
      success: false,
      message: `You are ${distanceMeters.toFixed(
        1
      )} meters away from the office. Over ${maxDistance} meters is not allowed.`,
    };
  }

  const now = new Date();
  const attendanceDate = getManilaDateKey(now);
  const serverTime = getReadableManilaTime(now);
  const manilaMinutes = getManilaMinutes(now);

  const { data: existingDay, error: existingDayError } = await supabase
    .from("attendance_days")
    .select("*")
    .eq("student_id", student.id)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  if (existingDayError) {
    return { success: false, message: existingDayError.message };
  }

  const ruleError = validateWindow(eventType, manilaMinutes, existingDay);
  if (ruleError) {
    return { success: false, message: ruleError };
  }

  let attendanceDay = existingDay;

  if (!attendanceDay) {
    const { data: insertedDay, error: insertDayError } = await supabase
      .from("attendance_days")
      .insert({
        student_id: student.id,
        assignment_id: assignment.id,
        office_id: office.id,
        attendance_date: attendanceDate,
        status: "open",
      })
      .select("*")
      .single();

    if (insertDayError || !insertedDay) {
      return {
        success: false,
        message: insertDayError?.message || "Unable to create attendance day.",
      };
    }

    attendanceDay = insertedDay;
  }

  const bucket = "attendance-photos";
  const fileExt = photoFile.name.split(".").pop() || "jpg";
  const filePath = `${student.id}/${attendanceDate}/${eventType}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, photoFile, {
      contentType: photoFile.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return {
      success: false,
      message: `Photo upload failed: ${uploadError.message}`,
    };
  }

  const { data: photoData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  const photoUrl = photoData.publicUrl;

  const parsedDeviceInfo = (() => {
    if (!deviceInfoRaw) return null;
    try {
      return JSON.parse(deviceInfoRaw);
    } catch {
      return null;
    }
  })();

  const { error: eventInsertError } = await supabase
    .from("attendance_events")
    .insert({
      attendance_day_id: attendanceDay.id,
      student_id: student.id,
      assignment_id: assignment.id,
      office_id: office.id,
      attendance_date: attendanceDate,
      event_type: eventType,
      event_at: now.toISOString(),
      latitude,
      longitude,
      accuracy_meters: accuracyMeters,
      distance_meters: distanceMeters,
      photo_url: photoUrl,
      activity_summary: activitySummary,
      device_info: parsedDeviceInfo,
    });

  if (eventInsertError) {
    return { success: false, message: eventInsertError.message };
  }

  const map = getEventColumnMap(eventType);

  const patch: Record<string, unknown> = {
    [map.timeCol]: now.toISOString(),
    [map.photoCol]: photoUrl,
    [map.latCol]: latitude,
    [map.lngCol]: longitude,
    [map.accuracyCol]: accuracyMeters,
    [map.distanceCol]: distanceMeters,
    [map.summaryCol]: activitySummary,
  };

  if (eventType === "am_out") {
    patch.am_work_seconds = getSecondsDiff(attendanceDay.am_in_at, now);
  }

  if (eventType === "pm_out") {
    patch.pm_work_seconds = getSecondsDiff(attendanceDay.pm_in_at, now);
    patch.status = "completed";
  }

  const { error: updateDayError } = await supabase
    .from("attendance_days")
    .update(patch)
    .eq("id", attendanceDay.id);

  if (updateDayError) {
    return { success: false, message: updateDayError.message };
  }

  const { data: totals } = await supabase
    .from("attendance_days")
    .select("total_work_seconds")
    .eq("student_id", student.id);

  const totalSeconds = (totals ?? []).reduce(
    (sum, row: any) => sum + Number(row.total_work_seconds ?? 0),
    0
  );

  const computedHours = Math.floor(totalSeconds / 3600);

  await supabase
    .from("students")
    .update({ completed_hours: computedHours })
    .eq("id", student.id);

  revalidatePath("/student");
  revalidatePath("/student/attendance");

  return {
    success: true,
    message: "Attendance recorded successfully.",
    serverTime,
    distanceMeters,
    eventType,
  };
}