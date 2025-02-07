import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const languages = [
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "French", code: "fr" },
  { name: "German", code: "de" },
  { name: "Italian", code: "it" },
  { name: "Russian", code: "ru" },
  { name: "Polish", code: "pl" },
  
];

async function main() {
  console.log("Starting language seeding...");

  for (const language of languages) {
    const existingLanguage = await prisma.language.findUnique({
      where: { code: language.code },
    });

    if (!existingLanguage) {
      await prisma.language.create({
        data: language,
      });
      console.log(`Created language: ${language.name} (${language.code})`);
    } else {
      console.log(`Language ${language.name} already exists, skipping...`);
    }
  }

  console.log("Language seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error seeding languages:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
