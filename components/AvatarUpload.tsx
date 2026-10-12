"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ছবি ছোট (সর্বোচ্চ 400px) করে JPEG বানায়, যাতে পেজ দ্রুত লোড হয়
async function compressImage(file: File, maxSize = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ছবি প্রসেস করা যায়নি");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("ছবি কম্প্রেস করা যায়নি"))),
      "image/jpeg",
      0.8
    );
  });
}

type Props = {
  userId: string;
  currentUrl?: string | null;
  onDone?: (url: string) => void;
};

export default function AvatarUpload({ userId, currentUrl, onDone }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // parent page-e notun url ashle sync rakhar jonno
  if (currentUrl && currentUrl !== url && !loading) {
    setUrl(currentUrl);
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file abar select korle-o kaj korbe
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("শুধু ছবি আপলোড করা যাবে");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ছবি ৫MB-এর কম হতে হবে");
      return;
    }

    setLoading(true);
    try {
      const blob = await compressImage(file);
      const path = `${userId}/avatar.jpg`; // একই path, তাই পুরনো ছবি replace হয়

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // cache bust

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ photo_url: publicUrl })
        .eq("id", userId);
      if (dbError) throw dbError;

      setUrl(publicUrl);
      onDone?.(publicUrl);
    } catch (err: any) {
      setError("আপলোড ব্যর্থ: " + (err?.message ?? "অজানা সমস্যা"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {url ? (
          <img
            src={url}
            alt="প্রোফাইল ছবি"
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-500">
            ছবি নেই
          </div>
        )}

        <label
          className={`cursor-pointer rounded-lg px-4 py-2 font-semibold text-white ${
            loading ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "আপলোড হচ্ছে..." : "ছবি আপলোড করুন"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleChange}
            disabled={loading}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        ছবি আপলোড হলে নিজে থেকেই সংরক্ষণ হয়ে যায়
      </p>
      {error && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}