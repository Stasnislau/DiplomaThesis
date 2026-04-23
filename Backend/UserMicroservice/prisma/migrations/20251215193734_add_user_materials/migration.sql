-- CreateTable
CREATE TABLE "user_materials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "analyzed_types" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_materials_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_materials" ADD CONSTRAINT "user_materials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
