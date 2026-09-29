import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, isHashedPin, verifyPin } from "@/lib/pin";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function fail(message: string, status: number) {
  return NextResponse.json({ status: "error", message }, { status });
}

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    if (!username || !pin) {
      return fail("Username dan PIN wajib diisi!", 400);
    }

    const user = await prisma.user.findUnique({ where: { username: String(username) } });
    if (!user) return fail("Username atau PIN salah!", 401);

    // Terkunci sementara setelah terlalu banyak salah PIN
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return fail(`Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`, 429);
    }

    const valid = await verifyPin(String(pin), user.pin);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: locked ? 0 : attempts,
          lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
        },
      });
      return locked
        ? fail(`PIN salah ${MAX_ATTEMPTS}x. Login dikunci ${LOCK_MINUTES} menit.`, 429)
        : fail(`Username atau PIN salah! Sisa percobaan: ${MAX_ATTEMPTS - attempts}.`, 401);
    }

    // Berhasil: reset hitungan & upgrade PIN lama ke hash
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        ...(isHashedPin(user.pin) ? {} : { pin: await hashPin(String(pin)) }),
      },
    });

    const response = NextResponse.json({
      status: "success",
      username: user.username,
      role: user.role,
    });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(user.username), sessionCookieOptions);
    return response;
  } catch (error: any) {
    return fail(error.message || "Internal server error", 500);
  }
}
