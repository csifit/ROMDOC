import { randomUUID } from "crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  validateUploadFile,
} from "@/lib/security/upload-policy";

export const runtime = "nodejs";

const STAGING_BUCKET = "doctor-photo-staging";
const PUBLIC_BUCKET = "doctor-profile-photos";
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requireActiveDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      doctor: null,
      response: NextResponse.json(
        { error: "Trebuie să fii autentificat." },
        { status: 401 }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    return {
      doctor: null,
      response: NextResponse.json(
        {
          error:
            "Doar medicii cu un cont activ își pot modifica fotografia.",
        },
        { status: 403 }
      ),
    };
  }

  const admin = createAdminClient();

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select("id, profile_id, photo_url, photo_storage_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    return {
      doctor: null,
      response: NextResponse.json(
        { error: "Profilul medicului nu a putut fi găsit." },
        { status: 404 }
      ),
    };
  }

  return {
    doctor,
    response: null,
  };
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization = await requireActiveDoctor();

  if (authorization.response || !authorization.doctor) {
    return authorization.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Fișierul trimis nu este valid." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selectează o fotografie." },
      { status: 400 }
    );
  }

  const validation =
    validateUploadFile({
      file,
      allowedMimeTypes:
        ALLOWED_IMAGE_MIME_TYPES,
      emptyMessage:
        "Selectează o fotografie.",
      typeMessage:
        "Fotografia trebuie să fie JPG, PNG sau WebP.",
    });

  if (!validation.ok) {
    return NextResponse.json(
      {
        error:
          validation.error,
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const admin = createAdminClient();
  const extension = extensionByMimeType[file.type];
  const objectId = randomUUID();
  const stagingPath = `${authorization.doctor.profile_id}/${objectId}.${extension}`;
  const publicPath = `${authorization.doctor.id}/${objectId}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const {
    error: stagingUploadError,
  } = await admin.storage
    .from(STAGING_BUCKET)
    .upload(stagingPath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (stagingUploadError) {
    console.error(
      "Doctor photo staging upload failed:",
      stagingUploadError
    );

    return NextResponse.json(
      { error: "Fotografia nu a putut fi încărcată." },
      { status: 500 }
    );
  }

  try {
    const {
      data: stagedObject,
      error: stagingDownloadError,
    } = await admin.storage
      .from(STAGING_BUCKET)
      .download(stagingPath);

    if (stagingDownloadError || !stagedObject) {
      throw stagingDownloadError ?? new Error("Missing staged image");
    }

    const stagedBytes = Buffer.from(
      await stagedObject.arrayBuffer()
    );

    if (
      stagedBytes.byteLength <= 0 ||
      stagedBytes.byteLength > MAX_UPLOAD_BYTES
    ) {
      throw new Error("Invalid staged image size");
    }

    const {
      error: publicUploadError,
    } = await admin.storage
      .from(PUBLIC_BUCKET)
      .upload(publicPath, stagedBytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (publicUploadError) {
      throw publicUploadError;
    }

    const {
      data: publicUrlData,
    } = admin.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(publicPath);

    const publicUrl = publicUrlData.publicUrl;

    const {
      error: updateError,
    } = await admin
      .from("doctors")
      .update({
        photo_url: publicUrl,
        photo_storage_path: publicPath,
      })
      .eq("id", authorization.doctor.id)
      .eq("profile_id", authorization.doctor.profile_id);

    if (updateError) {
      await admin.storage
        .from(PUBLIC_BUCKET)
        .remove([publicPath]);

      throw updateError;
    }

    if (authorization.doctor.photo_storage_path) {
      const {
        error: oldDeleteError,
      } = await admin.storage
        .from(PUBLIC_BUCKET)
        .remove([authorization.doctor.photo_storage_path]);

      if (oldDeleteError) {
        console.error(
          "Old doctor photo cleanup failed:",
          oldDeleteError
        );
      }
    }

    return NextResponse.json({
      success: true,
      photoUrl: publicUrl,
    });
  } catch (error) {
    console.error("Doctor photo promotion failed:", error);

    return NextResponse.json(
      {
        error:
          "Fotografia a fost încărcată, dar nu a putut fi publicată.",
      },
      { status: 500 }
    );
  } finally {
    const {
      error: stagingDeleteError,
    } = await admin.storage
      .from(STAGING_BUCKET)
      .remove([stagingPath]);

    if (stagingDeleteError) {
      console.error(
        "Doctor photo staging cleanup failed:",
        stagingDeleteError
      );
    }
  }
}

export async function DELETE(): Promise<Response> {
  const authorization = await requireActiveDoctor();

  if (authorization.response || !authorization.doctor) {
    return authorization.response;
  }

  const admin = createAdminClient();

  const {
    error: updateError,
  } = await admin
    .from("doctors")
    .update({
      photo_url: null,
      photo_storage_path: null,
    })
    .eq("id", authorization.doctor.id)
    .eq("profile_id", authorization.doctor.profile_id);

  if (updateError) {
    console.error("Doctor photo delete update failed:", updateError);

    return NextResponse.json(
      { error: "Fotografia nu a putut fi eliminată." },
      { status: 500 }
    );
  }

  if (authorization.doctor.photo_storage_path) {
    const {
      error: storageDeleteError,
    } = await admin.storage
      .from(PUBLIC_BUCKET)
      .remove([authorization.doctor.photo_storage_path]);

    if (storageDeleteError) {
      console.error(
        "Doctor photo storage deletion failed:",
        storageDeleteError
      );
    }
  }

  return NextResponse.json({
    success: true,
    photoUrl: null,
  });
}
