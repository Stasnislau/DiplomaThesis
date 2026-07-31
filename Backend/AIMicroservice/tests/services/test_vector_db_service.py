"""Writing chunks into a materials table that predates per-owner scoping.

Uploads were pooled for every learner until each chunk started carrying the id
of the owner who uploaded it. A table written before that change has no such
column, and LanceDB refuses a row that carries one. Every upload against an
existing database then failed with a server error, so the widening below is the
part worth pinning.
"""

import lancedb
import numpy as np
import pandas as pd
import pytest

from models.dtos.material_dtos import ChunkMetadata
from services.vector_db_service import VectorDBService


class _StubEncoder:
    """Stands in for the sentence transformer, which is slow to load."""

    def encode(self, chunks):
        return np.zeros((len(chunks), 4), dtype=np.float32)


@pytest.fixture
def service(tmp_path):
    svc = VectorDBService.__new__(VectorDBService)
    svc.db = lancedb.connect(str(tmp_path / "vectors.db"))
    svc.model = _StubEncoder()
    svc.table_name = "levels"
    svc.materials_table_name = "materials"
    svc.templates_table_name = "task_templates"
    return svc


def _legacy_table(service):
    """A materials table as it looked before uploads were scoped to an owner."""
    service.db.create_table(
        service.materials_table_name,
        data=pd.DataFrame(
            [
                {
                    "text": "an older chunk",
                    "vector": [0.0, 0.0, 0.0, 0.0],
                    "source": "old.pdf",
                    "chunk_index": 0,
                }
            ]
        ),
    )


def test_saves_into_a_table_written_before_owner_scoping(service):
    _legacy_table(service)

    service.save_chunks(
        ["a new chunk"],
        [ChunkMetadata(source="new.pdf", chunk_index=0)],
        user_id="11111111-1111-1111-1111-111111111111",
    )

    table = service.db.open_table(service.materials_table_name)
    assert "user_id" in table.schema.names
    rows = table.to_pandas()
    assert len(rows) == 2


def test_leaves_older_rows_without_an_owner(service):
    _legacy_table(service)

    service.save_chunks(
        ["a new chunk"],
        [ChunkMetadata(source="new.pdf", chunk_index=0)],
        user_id="11111111-1111-1111-1111-111111111111",
    )

    rows = service.db.open_table(service.materials_table_name).to_pandas()
    old = rows[rows["source"] == "old.pdf"].iloc[0]
    assert old["user_id"] == ""


def test_keeps_the_owner_on_the_new_chunk(service):
    _legacy_table(service)
    owner = "22222222-2222-2222-2222-222222222222"

    service.save_chunks(
        ["a new chunk"],
        [ChunkMetadata(source="new.pdf", chunk_index=0)],
        user_id=owner,
    )

    rows = service.db.open_table(service.materials_table_name).to_pandas()
    new = rows[rows["source"] == "new.pdf"].iloc[0]
    assert new["user_id"] == owner


def test_creates_the_table_with_the_owner_column_when_none_exists(service):
    service.save_chunks(
        ["a first chunk"],
        [ChunkMetadata(source="first.pdf", chunk_index=0)],
        user_id="33333333-3333-3333-3333-333333333333",
    )

    table = service.db.open_table(service.materials_table_name)
    assert "user_id" in table.schema.names
