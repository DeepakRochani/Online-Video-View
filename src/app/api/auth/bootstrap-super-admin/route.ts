export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readPhotographers, savePhotographer, hashUserPassword } from "@/lib/db";
import { PhotographerAccount } from "@/lib/project-types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, setupSecret } = body;

    const photographers = readPhotographers();
    const existingSuperAdmin = photographers.find(
      (p) => p.role === "SUPER_ADMIN" || p.role === "platform_admin"
    );

    // If super admin already exists, strictly require setupSecret matching process.env.SETUP_SECRET
    if (existingSuperAdmin) {
      if (!process.env.SETUP_SECRET || setupSecret !== process.env.SETUP_SECRET) {
        return NextResponse.json(
          { error: "Super admin account already initialized. Access denied." },
          { status: 403 }
        );
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required to bootstrap the Super Admin account." },
        { status: 400 }
      );
    }

    const normEmail = email.trim().toLowerCase();
    const passwordHash = await hashUserPassword(password);

    if (existingSuperAdmin) {
      existingSuperAdmin.email = normEmail;
      existingSuperAdmin.name = (name || existingSuperAdmin.name || "Platform Owner").trim();
      existingSuperAdmin.passwordHash = passwordHash;
      existingSuperAdmin.role = "SUPER_ADMIN";
      existingSuperAdmin.status = "ACTIVE";
      existingSuperAdmin.tokenVersion = (existingSuperAdmin.tokenVersion || 1) + 1;
      existingSuperAdmin.updatedAt = new Date().toISOString();
      savePhotographer(existingSuperAdmin);

      return NextResponse.json({
        success: true,
        message: "Super Admin credentials updated successfully.",
        admin: {
          id: existingSuperAdmin.id,
          email: existingSuperAdmin.email,
          name: existingSuperAdmin.name,
          role: existingSuperAdmin.role,
        },
      });
    }

    const newAdmin: PhotographerAccount = {
      id: "photographer-super-admin",
      email: normEmail,
      name: (name || "Platform Owner").trim(),
      passwordHash,
      studioName: "DR Films Platform Control Center",
      tagline: "SaaS Super Admin & Operations",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePhotographer(newAdmin);

    return NextResponse.json({
      success: true,
      message: "First Super Admin created successfully.",
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });
  } catch (err: unknown) {
    console.error("Bootstrap super admin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
