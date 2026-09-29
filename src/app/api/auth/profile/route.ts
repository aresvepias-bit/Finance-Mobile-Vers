import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import { createSessionToken, getSessionUsername, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUsername(request);
    if (!sessionUser) {
      return NextResponse.json({ status: "error", message: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const { username, pin } = await request.json();
    const newUsername = String(username || "").trim();
    const newPin = String(pin || "");

    if (!newUsername && !newPin) {
      return NextResponse.json({ status: "error", message: "Data update tidak boleh kosong!" }, { status: 400 });
    }
    if (newPin && !/^\d{6}$/.test(newPin)) {
      return NextResponse.json({ status: "error", message: "PIN harus 6 digit angka!" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username: sessionUser } });
    if (!user) {
      return NextResponse.json({ status: "error", message: "User tidak ditemukan" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(newUsername ? { username: newUsername } : {}),
        ...(newPin ? { pin: await hashPin(newPin) } : {}),
      },
    });

    const response = NextResponse.json({
      status: "success",
      message: "Profil berhasil diperbarui",
      username: updatedUser.username,
    });

    // Username berubah: terbitkan token sesi baru
    if (updatedUser.username !== sessionUser) {
      response.cookies.set(SESSION_COOKIE, await createSessionToken(updatedUser.username), sessionCookieOptions);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
