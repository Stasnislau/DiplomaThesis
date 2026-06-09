import asyncio
import logging
import os
import uuid
from typing import Optional

import aiofiles


logger = logging.getLogger(__name__)

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")


# Imagen 3 generally available models. `imagen-3.0-generate-002` is the
# current standard-quality model — best balance of detail and cost for
# picture-description scenes. `imagen-3.0-fast-generate-001` is ~2x
# cheaper but loses fidelity on multi-subject scenes; we don't use it.
_DEFAULT_MODEL = "imagen-3.0-generate-002"


class ImageService:
    """Generates images for speaking picture-description tasks via
    Google Vertex AI Imagen 3.

    Initialisation is best-effort: if the project ID isn't set or the
    Vertex SDK fails to bind credentials at import time, the service
    silently disables itself (`generate()` returns None). Callers can
    then fall back to Pollinations or any other route — we never
    crash the speaking flow because of an image hiccup.
    """

    def __init__(
        self,
        project_id: str | None = None,
        location: str | None = None,
        model_name: str | None = None,
    ) -> None:
        self.project_id = project_id or os.getenv("VERTEX_AI_PROJECT_ID")
        self.location = location or os.getenv("VERTEX_AI_LOCATION", "us-central1")
        self.model_name = (
            model_name or os.getenv("VERTEX_AI_IMAGE_MODEL") or _DEFAULT_MODEL
        )

        self._model: Optional[object] = None
        self._enabled = False

        if not self.project_id:
            logger.warning(
                "ImageService: VERTEX_AI_PROJECT_ID is not set — Imagen disabled, "
                "callers will fall back to their alternative renderer."
            )
            return

        try:
            import vertexai
            from vertexai.preview.vision_models import ImageGenerationModel

            vertexai.init(project=self.project_id, location=self.location)
            self._model = ImageGenerationModel.from_pretrained(self.model_name)
            self._enabled = True
            logger.info(
                "ImageService ready: project=%s location=%s model=%s",
                self.project_id,
                self.location,
                self.model_name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "ImageService init failed (%s) — Imagen disabled, fallback active.",
                exc,
            )

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def generate(self, visual_prompt: str) -> str | None:
        """Render `visual_prompt` to a PNG, save it under
        `static/images/<uuid>.png`, and return the public URL.

        Returns None on any failure so the caller can route to a
        fallback renderer instead of surfacing a 500.
        """
        if not self._enabled or self._model is None:
            return None

        cleaned = (visual_prompt or "").strip()
        if not cleaned:
            return None
        # Imagen rejects extremely long prompts; the LLM occasionally
        # spills a paragraph here, trim defensively.
        cleaned = cleaned[:1500]

        try:
            loop = asyncio.get_running_loop()
            images = await loop.run_in_executor(
                None,
                self._generate_blocking,
                cleaned,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Imagen generation failed: %s", exc)
            return None

        if not images:
            logger.warning("Imagen returned no images for prompt: %s", cleaned[:80])
            return None

        # `_image_bytes` is the SDK's documented but underscored accessor.
        # `.save()` is the alternative but writes through synchronous
        # filesystem calls we'd rather avoid in async context.
        image_bytes = getattr(images[0], "_image_bytes", None)
        if not image_bytes:
            logger.warning("Imagen response had empty bytes — falling back.")
            return None

        out_dir = "static/images"
        os.makedirs(out_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.png"
        file_path = os.path.join(out_dir, file_name)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(image_bytes)

        return f"{PUBLIC_BASE_URL}/static/images/{file_name}"

    def _generate_blocking(self, prompt: str) -> list:
        """Synchronous Imagen call wrapped by `generate()` in an executor.

        Aspect ratio 4:3 matches the FE picture-description card and is
        what Pollinations was producing before (1024x768). `block_some`
        is Google's middle-ground safety setting — enough to keep the
        explicit content out of a language-learning app without
        rejecting normal everyday scenes (which `block_most` does).
        `allow_adult` lets people appear in the image, which we need
        for "describe what this person is doing" prompts.
        """
        return self._model.generate_images(  # type: ignore[union-attr]
            prompt=prompt,
            number_of_images=1,
            aspect_ratio="4:3",
            safety_filter_level="block_some",
            person_generation="allow_adult",
        )
