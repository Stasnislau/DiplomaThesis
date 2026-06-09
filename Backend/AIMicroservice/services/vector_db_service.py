import re

import lancedb
from sentence_transformers import SentenceTransformer
import pandas as pd
from constants.constants import LEVEL_EMBEDDINGS

from models.dtos.vector_db_dtos import SpecificSkillContext, FullLevelContext, SimilarLevel, LevelSkills, MaterialChunk, TaskTemplate
from models.dtos.material_dtos import ChunkMetadata
from typing import List, Union, Optional, Dict, Any

# Strict UUID format check used to gate user_id before it's
# interpolated into a LanceDB where-clause. Anything that doesn't
# match short-circuits to "no results" rather than risking a
# malformed/injected filter expression.
_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
)

class VectorDBService:
    def __init__(self) -> None:
        self.db = lancedb.connect("language_levels.db")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.table_name = "levels"
        self.materials_table_name = "materials"
        self.templates_table_name = "task_templates"
        self.initialize_db()

    def initialize_db(self) -> None:
        try:
            if self.table_name not in self.db.table_names():
                data = []
                for level, skills in LEVEL_EMBEDDINGS.items():
                    full_description = f"Level {level} proficiency description:\n"
                    for skill, description in skills.items():
                        full_description += f"{skill}: {description}\n"

                    embedding = self.model.encode(full_description)

                    data.append(
                        {
                            "level": level,
                            "full_description": full_description,
                            "listening": skills["Listening"],
                            "reading": skills["Reading"],
                            "spoken_interaction": skills["Spoken Interaction"],
                            "spoken_production": skills["Spoken Production"],
                            "writing": skills["Writing"],
                            "vector": embedding.tolist(),
                        }
                    )

                df = pd.DataFrame(data)
                self.db.create_table(self.table_name, data=df)
                print(f"Table {self.table_name} created successfully")

            if self.materials_table_name not in self.db.table_names():
                pass
            if self.templates_table_name not in self.db.table_names():
                pass

        except Exception as e:
            raise e

    def get_level_context(self, level: str, skill_type: Optional[str] = None) -> Optional[Union[SpecificSkillContext, FullLevelContext]]:
        try:
            table = self.db.open_table(self.table_name)
            df = table.to_pandas()
            result = df[df["level"] == level]

            if result.empty:
                return None

            level_data = result.to_dict("records")[0]

            if skill_type and skill_type.lower() in level_data:
                return SpecificSkillContext(
                    level=level,
                    skill_type=skill_type,
                    description=level_data[skill_type.lower()],
                )
            else:
                level_skills = LevelSkills(
                    listening=level_data["listening"],
                    reading=level_data["reading"],
                    spoken_interaction=level_data["spoken_interaction"],
                    spoken_production=level_data["spoken_production"],
                    writing=level_data["writing"],
                )
                return FullLevelContext(
                    level=level,
                    full_description=level_data["full_description"],
                    skills=level_skills,
                )

        except Exception as e:
            raise e

    def find_similar_levels(self, query: str, limit: int = 3) -> List[SimilarLevel]:
        try:
            query_embedding = self.model.encode(query)
            table = self.db.open_table(self.table_name)
            results = table.search(query_embedding.tolist()).limit(limit).to_pandas()

            formatted_results = []
            for _, row in results.iterrows():
                level_skills = LevelSkills(
                    listening=row["listening"],
                    reading=row["reading"],
                    spoken_interaction=row["spoken_interaction"],
                    spoken_production=row["spoken_production"],
                    writing=row["writing"],
                )
                formatted_results.append(
                    SimilarLevel(
                        level=row["level"],
                        similarity_score=float(row["_distance"]),
                        skills=level_skills,
                    )
                )

            return formatted_results

        except Exception as e:
            raise e

    def save_chunks(
        self,
        chunks: List[str],
        metadatas: List[ChunkMetadata],
        user_id: Optional[str] = None,
    ) -> None:
        """
        Saves text chunks and their metadata to the materials table.

        user_id is stored alongside each chunk so that search_materials
        can filter results to a single owner. Without it the previous
        implementation pooled all users' uploads into one search index,
        meaning user A's quiz could be generated from user B's PDF.
        """
        try:
            embeddings = self.model.encode(chunks)
            data = []
            for i, chunk in enumerate(chunks):
                record = {
                    "text": chunk,
                    "vector": embeddings[i].tolist(),
                    "source": metadatas[i].source,
                    "chunk_index": metadatas[i].chunk_index,
                    # Empty string instead of None — LanceDB schema needs
                    # a stable column type, and an empty string still
                    # disambiguates pre-multitenant rows from post.
                    "user_id": user_id or "",
                }
                data.append(record)

            df = pd.DataFrame(data)

            if self.materials_table_name in self.db.table_names():
                table = self.db.open_table(self.materials_table_name)
                table.add(data=df)
            else:
                self.db.create_table(self.materials_table_name, data=df)

        except Exception as e:
            print(f"Error saving chunks: {e}")
            raise e

    def search_materials(
        self,
        query: str,
        limit: int = 5,
        user_id: Optional[str] = None,
    ) -> List[MaterialChunk]:
        """
        Searches for materials similar to the query.

        If user_id is provided, results are restricted to chunks that
        belong to that user. Pre-multitenant rows have user_id="" and
        are NEVER returned in a scoped query — they're effectively
        invisible until backfilled.
        """
        try:
            if self.materials_table_name not in self.db.table_names():
                return []

            query_embedding = self.model.encode(query)
            table = self.db.open_table(self.materials_table_name)

            search = table.search(query_embedding.tolist())
            if user_id:
                # `user_id` arrives via the X-User-Id header (validated
                # JWT-derived UUID in our flow). Reject anything that
                # doesn't look like a UUID before pasting it into the
                # where-clause, so a malformed header can never inject
                # SQL fragments into the LanceDB query.
                if not _UUID_RE.match(user_id):
                    return []
                try:
                    search = search.where(f"user_id = '{user_id}'")
                except Exception:  # noqa: BLE001
                    pass
            results_df = search.limit(limit).to_pandas()

            # Defensive post-filter: even if the where-clause can't be
            # applied (older table schema), drop foreign-user rows here.
            records = results_df.to_dict("records")
            if user_id and "user_id" in results_df.columns:
                records = [r for r in records if r.get("user_id") == user_id]

            # Strip the user_id field before constructing MaterialChunk
            # so we don't have to widen the dto for an internal-only key.
            for r in records:
                r.pop("user_id", None)

            return [MaterialChunk(**record) for record in records]

        except Exception as e:
            print(f"Error searching materials: {e}")
            raise e

    def save_task_templates(self, templates: List[TaskTemplate]) -> None:
        """
        Saves extracted task templates.
        """
        if not templates:
            return
        try:
            embeddings = self.model.encode([t.template for t in templates])
            data = []
            for i, template in enumerate(templates):
                record = template.model_dump()
                record["vector"] = embeddings[i].tolist()
                data.append(record)

            df = pd.DataFrame(data)
            if self.templates_table_name in self.db.table_names():
                table = self.db.open_table(self.templates_table_name)
                table.add(data=df)
            else:
                self.db.create_table(self.templates_table_name, data=df)
        except Exception as e:
            print(f"Error saving templates: {e}")
            raise e

    def search_task_templates(self, query: str, limit: int = 20) -> List[TaskTemplate]:
        """
        Searches for stored task templates similar to the query.
        """
        try:
            if self.templates_table_name not in self.db.table_names():
                return []
            query_embedding = self.model.encode(query)
            table = self.db.open_table(self.templates_table_name)
            results = (
                table.search(query_embedding.tolist())
                .limit(limit)
                .to_pandas()
            )
            records = results.to_dict("records")
            return [TaskTemplate(**rec) for rec in records]
        except Exception as e:
            print(f"Error searching templates: {e}")
            return []

    def get_task_template_by_id(self, template_id: str) -> Optional[TaskTemplate]:
        """
        Returns a template by its id.
        """
        try:
            if self.templates_table_name not in self.db.table_names():
                return None
            table = self.db.open_table(self.templates_table_name)
            df = table.to_pandas()
            result = df[df["id"] == template_id]
            if result.empty:
                return None
            record = result.to_dict("records")[0]
            return TaskTemplate(**record)
        except Exception as e:
            print(f"Error fetching template by id: {e}")
            raise e
