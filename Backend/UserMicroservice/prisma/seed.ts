const SeedLanguages = [
  {
    name: "English",
    code: "en",
  },
  {
    name: "Spanish",
    code: "es",
  },
  {
    name: "French",
    code: "fr",
  },
  {
    name: "German",
    code: "de",
  },
  {
    name: "Italian",
    code: "it",
  },
  {
    name: "Russian",
    code: "ru",
  },
  {
    name: "Polish",
    code: "pl",
  },
];

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const languages = await prisma.language.findMany();

  if (!languages || languages.length === 0 || languages.length !== SeedLanguages.length) {

    for (const language of SeedLanguages) {
      console.log("Creating language:", language);
      if (languages.find((l) => l.code === language.code)) {
        console.log("Language already exists:", language);
        continue;
      }
      await prisma.language.create({
        data: {
          name: language.name,
          code: language.code,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error("Error seeding languages:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
