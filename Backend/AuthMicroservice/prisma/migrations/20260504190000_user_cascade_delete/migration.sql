-- Cascade-delete refresh_tokens and credentials when their owning
-- user is removed. Without this, prisma.user.delete() throws an FK
-- violation on any user that has ever logged in.

ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credentials" DROP CONSTRAINT IF EXISTS "credentials_user_id_fkey";
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
