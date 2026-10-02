import { v2 as cloudinary } from "cloudinary";

// อัปโหลดรูปจากฝั่งเซิร์ฟเวอร์เท่านั้น คีย์อยู่ใน env (ห้าม NEXT_PUBLIC_)
// ไม่มีคีย์ครบ = ปิดการแนบรูป ฟอร์มซ่อนช่อง และ DAL ปฏิเสธไฟล์ที่ส่งมา

export const uploadsEnabled = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/** คืน secure_url · ย่อด้านยาวไม่เกิน 1600px ที่ Cloudinary — ชนิดและขนาดไฟล์ตรวจแล้วก่อนเรียก (photoError) */
export async function uploadImage(file: File, folder: string): Promise<string> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const bytes = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }] },
        (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary upload failed")) : resolve(res.secure_url)),
      )
      .end(bytes);
  });
}
