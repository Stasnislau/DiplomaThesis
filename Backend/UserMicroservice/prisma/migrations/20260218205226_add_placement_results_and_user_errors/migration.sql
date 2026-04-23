-- CreateTable
CREATE TABLE "placement_test_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_errors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "error_text" TEXT NOT NULL,
    "correction" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "context" TEXT,
    "source" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "last_occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_errors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "placement_test_results" ADD CONSTRAINT "placement_test_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_test_results" ADD CONSTRAINT "placement_test_results_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_errors" ADD CONSTRAINT "user_errors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_errors" ADD CONSTRAINT "user_errors_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
