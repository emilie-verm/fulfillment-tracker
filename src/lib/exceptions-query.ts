import "server-only";
import type { Prisma } from "@prisma/client";
import { TERMINAL_STAGES } from "@/lib/constants";

export type ExceptionSearchParams = {
  orderNumber?: string;
  productName?: string;
  stage?: string;
  exceptionType?: string;
  from?: string;
  to?: string;
  view?: string; // "open" | "all" — only used by /exceptions
};

export function buildExceptionWhere(
  params: ExceptionSearchParams,
  { defaultOpenOnly }: { defaultOpenOnly: boolean }
): Prisma.ExceptionWhereInput {
  const where: Prisma.ExceptionWhereInput = {};

  if (params.orderNumber) {
    where.orderNumber = { contains: params.orderNumber, mode: "insensitive" };
  }
  if (params.productName) {
    where.productName = { contains: params.productName, mode: "insensitive" };
  }
  if (params.stage) {
    where.stage = params.stage as Prisma.EnumExceptionStageFilter["equals"];
  } else if (defaultOpenOnly && params.view !== "all") {
    where.stage = { notIn: TERMINAL_STAGES };
  }
  if (params.exceptionType) {
    where.exceptionType = params.exceptionType as Prisma.EnumExceptionTypeFilter["equals"];
  }
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T23:59:59`) } : {}),
    };
  }

  return where;
}
