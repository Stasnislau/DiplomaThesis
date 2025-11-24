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

const SeedAIProviders = [
  {
    id: "openai",
    name: "OpenAI",
  },
  {
    id: "google-geminis",
    name: "Google (geminis)",
  },
  {
    id: "mistral",
    name: "Mistral",
  },
  {
    id: "claude",
    name: "Claude",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
  },
  {
    id: "groq",
    name: "Groq",
  },
];

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const languages = await prisma.language.findMany();

  if (
    !languages ||
    languages.length === 0 ||
    languages.length !== SeedLanguages.length
  ) {
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
  const aiProviders = await prisma.aIProvider.findMany();
  if (
    !aiProviders ||
    aiProviders.length === 0 ||
    aiProviders.length !== SeedAIProviders.length
  ) {
    for (const aiProvider of SeedAIProviders) {
      console.log("Creating ai provider:", aiProvider);
      if (aiProviders.find((a) => a.id === aiProvider.id)) {
        console.log("Ai provider already exists:", aiProvider);
        continue;
      }
      await prisma.aIProvider.create({
        data: {
          id: aiProvider.id,
          name: aiProvider.name,
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
