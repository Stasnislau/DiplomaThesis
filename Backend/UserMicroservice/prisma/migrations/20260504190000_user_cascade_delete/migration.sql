-- Replace every User-keyed FK with ON DELETE CASCADE so admin
-- delete-user actually works (and so a deleted user doesn't leave
-- orphan AI tokens, materials, history, etc. behind).

ALTER TABLE "user_languages" DROP CONSTRAINT IF EXISTS "user_languages_user_id_fkey";
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_ai_tokens" DROP CONSTRAINT IF EXISTS "user_ai_tokens_user_id_fkey";
ALTER TABLE "user_ai_tokens" ADD CONSTRAINT "user_ai_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "user_achievements_user_id_fkey";
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_materials" DROP CONSTRAINT IF EXISTS "user_materials_user_id_fkey";
ALTER TABLE "user_materials" ADD CONSTRAINT "user_materials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "placement_test_results" DROP CONSTRAINT IF EXISTS "placement_test_results_user_id_fkey";
ALTER TABLE "placement_test_results" ADD CONSTRAINT "placement_test_results_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_errors" DROP CONSTRAINT IF EXISTS "user_errors_user_id_fkey";
ALTER TABLE "user_errors" ADD CONSTRAINT "user_errors_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_lesson_progress" DROP CONSTRAINT IF EXISTS "user_lesson_progress_user_id_fkey";
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_history" DROP CONSTRAINT IF EXISTS "task_history_user_id_fkey";
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
