import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUsername } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const username = await getSessionUsername(request);
    if (!username) {
      return NextResponse.json({ status: "error", message: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ status: "error", message: "User tidak valid" }, { status: 401 });
    }

    return NextResponse.json({
      status: "success",
      username: user.username,
      role: user.role,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
