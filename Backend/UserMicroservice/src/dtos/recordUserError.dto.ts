import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Payload for recording a single recurring user error (FR6).
 *
 * `languageCode` is the ISO 639-1 code (e.g. "en", "pl") — the AI
 * microservice already normalises the language it grades to this code
 * via `to_iso_language`, and it matches the unique `code` column on the
 * Language table. The service resolves it to the internal languageId.
 */
export class RecordUserErrorDto {
  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @IsString()
  @IsNotEmpty()
  errorText: string;

  @IsString()
  @IsNotEmpty()
  correction: string;

  // Grammar | Vocabulary | Phrasing | Fluency (mirrors the AI service's
  // IdentifiedError.error_type). Kept a free string to stay forward
  // compatible with new AI-emitted types without a redeploy.
  @IsString()
  @IsNotEmpty()
  errorType: string;

  // Which exercise/skill produced the error, e.g. "speaking", "essay".
  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsOptional()
  context?: string;
}
