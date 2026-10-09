import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";

export async function eventTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (attempt < 2 && error && typeof error === "object" && "code" in error && error.code === "P2034") continue;
      throw error;
    }
  }
}
