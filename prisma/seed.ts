import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Seeds the three initial accounts. Passwords come from env vars so real
// credentials never live in source control; if unset, a random one is
// generated and printed once so whoever runs this can hand it off.
function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function upsertUser(opts: {
  name: string;
  email: string;
  role: "FULFILLMENT" | "OUTREACH" | "ADMIN";
  envVar: string;
}) {
  const existing = await db.user.findUnique({ where: { email: opts.email } });
  if (existing) {
    console.log(`Skipping ${opts.email} — already exists.`);
    return;
  }

  const password = process.env[opts.envVar] ?? randomPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      name: opts.name,
      email: opts.email,
      role: opts.role,
      passwordHash,
    },
  });

  console.log(`Created ${opts.role} account: ${opts.email} / ${password}`);
}

async function main() {
  await upsertUser({
    name: "Camille",
    email: "camille@lilsweettreat.com",
    role: "FULFILLMENT",
    envVar: "SEED_CAMILLE_PASSWORD",
  });
  await upsertUser({
    name: "Mary",
    email: "mary@lilsweettreat.com",
    role: "OUTREACH",
    envVar: "SEED_MARY_PASSWORD",
  });
  await upsertUser({
    name: "Emilie",
    email: "emilie@lilsweettreat.com",
    role: "ADMIN",
    envVar: "SEED_EMILIE_PASSWORD",
  });

  console.log(
    "\nSave these passwords now — they are not stored anywhere and won't be printed again. Each person should change theirs from the Account page after first login."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
