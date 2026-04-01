import "dotenv/config";
import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { menuItems } from "../shared/schema";
import { eq } from "drizzle-orm";
import { supabase, supabaseMenuBucket, supabasePublicBaseUrl } from "../server/supabase";

const uploadsDir = path.resolve(process.cwd(), "uploads", "menu-images");

async function main() {
  if (!fs.existsSync(uploadsDir)) {
    throw new Error(`Uploads directory not found: ${uploadsDir}`);
  }

  const files = fs.readdirSync(uploadsDir).filter((file) => !file.startsWith("."));
  if (files.length === 0) {
    console.log("No files found in uploads/menu-images.");
    return;
  }

  console.log(`Found ${files.length} files. Uploading to Supabase bucket "${supabaseMenuBucket}"...`);

  let uploaded = 0;
  let updated = 0;
  let skipped = 0;

  const contentTypeFor = (name: string) => {
    const ext = path.extname(name).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    return "application/octet-stream";
  };

  for (const filename of files) {
    const localPath = path.join(uploadsDir, filename);
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) {
      skipped += 1;
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const objectPath = `menu-items/${filename}`;
    const { error } = await supabase.storage
      .from(supabaseMenuBucket)
      .upload(objectPath, buffer, { upsert: true, contentType: contentTypeFor(filename) });

    if (error) {
      console.error(`Upload failed for ${filename}: ${error.message}`);
      skipped += 1;
      continue;
    }

    uploaded += 1;
    const publicUrl = `${supabasePublicBaseUrl}/${objectPath}`;
    const localUrl = `/uploads/menu-images/${filename}`;

    const result = await db
      .update(menuItems)
      .set({ imageUrl: publicUrl })
      .where(eq(menuItems.imageUrl, localUrl))
      .returning({ id: menuItems.id });
    updated += result.length;
  }

  console.log(`Upload complete. Uploaded: ${uploaded}, DB rows updated: ${updated}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
