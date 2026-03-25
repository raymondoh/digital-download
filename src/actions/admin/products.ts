"use server";

import { adminDb } from "@/lib/firebase/admin";
import { productSchema, type Product } from "@/lib/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { env } from "@/lib/env";

//const ADMIN_EMAIL = "raymondmhylton@gmail.com";
// 1. Verify Admin Status securely on the server using the env variable
// const session = await getServerSession(authOptions);
// if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
//   throw new Error("Unauthorized access");
// }
const session = await getServerSession(authOptions);

if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
  throw new Error("Unauthorized access");
}

type CreateProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export async function createProduct(formData: CreateProductInput) {
  try {
    // const session = await getServerSession(authOptions);

    // if (!session?.user || session.user.email !== env.ADMIN_EMAIL) {
    //   throw new Error("Unauthorized access");
    // }
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
      throw new Error("Unauthorized access");
    }

    const docRef = adminDb.collection("products").doc();

    const completeProductData = {
      ...formData,
      id: docRef.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const parsedData = productSchema.parse(completeProductData);

    await docRef.set(parsedData);

    revalidatePath("/admin/inventory");
    revalidatePath("/");

    return { success: true, id: docRef.id };
  } catch (error: unknown) {
    console.error("❌ Failed to create product:", error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues.map(issue => issue.message).join(", ")
      };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to create product" };
  }
}
