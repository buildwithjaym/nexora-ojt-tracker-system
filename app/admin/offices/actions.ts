"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OfficeActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toNullableFloat(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function createOffice(
  formData: FormData
): Promise<OfficeActionResult> {
  const supabase = await createClient();

  const name = cleanText(formData.get("name"));
  const address = toNullable(cleanText(formData.get("address")));
  const contact_person = toNullable(cleanText(formData.get("contact_person")));
  const contact_email = toNullable(
    cleanText(formData.get("contact_email")).toLowerCase()
  );
  const contact_phone = toNullable(cleanText(formData.get("contact_phone")));
  const capacityRaw = cleanText(formData.get("capacity"));
  const status = cleanText(formData.get("status")) || "active";
  const latitude = toNullableFloat(cleanText(formData.get("latitude")));
  const longitude = toNullableFloat(cleanText(formData.get("longitude")));

  if (!name) {
    return {
      success: false,
      message: "Office name is required.",
    };
  }

  if (contact_email && !isValidEmail(contact_email)) {
    return {
      success: false,
      message: "Please enter a valid contact email address.",
    };
  }

  const capacity =
    capacityRaw.trim() === "" ? null : Number.parseInt(capacityRaw, 10);

  if (capacity !== null && Number.isNaN(capacity)) {
    return {
      success: false,
      message: "Capacity must be a valid number.",
    };
  }

  const { error } = await supabase.from("offices").insert({
    name,
    address,
    contact_person,
    contact_email,
    contact_phone,
    capacity,
    status,
    latitude,
    longitude,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/offices");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Office created successfully.",
  };
}

export async function updateOffice(
  officeId: string,
  formData: FormData
): Promise<OfficeActionResult> {
  const supabase = await createClient();

  const name = cleanText(formData.get("name"));
  const address = toNullable(cleanText(formData.get("address")));
  const contact_person = toNullable(cleanText(formData.get("contact_person")));
  const contact_email = toNullable(
    cleanText(formData.get("contact_email")).toLowerCase()
  );
  const contact_phone = toNullable(cleanText(formData.get("contact_phone")));
  const capacityRaw = cleanText(formData.get("capacity"));
  const status = cleanText(formData.get("status")) || "active";
  const latitude = toNullableFloat(cleanText(formData.get("latitude")));
  const longitude = toNullableFloat(cleanText(formData.get("longitude")));

  if (!name) {
    return {
      success: false,
      message: "Office name is required.",
    };
  }

  if (contact_email && !isValidEmail(contact_email)) {
    return {
      success: false,
      message: "Please enter a valid contact email address.",
    };
  }

  const capacity =
    capacityRaw.trim() === "" ? null : Number.parseInt(capacityRaw, 10);

  if (capacity !== null && Number.isNaN(capacity)) {
    return {
      success: false,
      message: "Capacity must be a valid number.",
    };
  }

  const { error } = await supabase
    .from("offices")
    .update({
      name,
      address,
      contact_person,
      contact_email,
      contact_phone,
      capacity,
      status,
      latitude,
      longitude,
    })
    .eq("id", officeId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/offices");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Office updated successfully.",
  };
}

export async function deleteOffice(
  officeId: string
): Promise<OfficeActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("offices").delete().eq("id", officeId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/admin/offices");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Office deleted successfully.",
  };
}