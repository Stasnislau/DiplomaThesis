import lancedb
from sentence_transformers import SentenceTransformer
import pandas as pd
from constants.constants import LEVEL_EMBEDDINGS
# Import new DTOs and typing helpers
from models.dtos.vector_db_dtos import (
    SpecificSkillContext, FullLevelContext, SimilarLevel, LevelSkills
)
from typing import List, Union, Optional


class VectorDBService:
    def __init__(self) -> None:
        self.db = lancedb.connect("language_levels.db")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.table_name = "levels"
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
