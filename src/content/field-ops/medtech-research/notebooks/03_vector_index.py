# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_vector_index.py
# MISSION:  medtech-research — Medical Research Discovery
# STATUS:   BROKEN — Vector index missing SYNC SCHEDULE
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Create a Mosaic AI Vector Search index on the Silver paper_chunks table.
#   The index enables semantic similarity search: given a query string, find
#   the top-k most similar chunks.
#
# WHAT YOU'LL LEARN:
#   ✅ Mosaic AI Vector Search index creation
#   ✅ Delta Sync Index vs Direct Vector Access
#   ✅ Embedding model specification for the index
#   ✅ Index sync schedules (Triggered vs Continuous)
#
# ⚠️ KNOWN BUG:
#   The CREATE VECTOR INDEX statement is missing the `SYNC SCHEDULE` clause.
#   Without it, the index is created but never syncs to the source table —
#   so the index stays empty and SHOW INDEXES shows status 'OFFLINE' or empty.
#
# VECTOR SEARCH CONCEPTS:
#   - Delta Sync Index: server-managed sync from a source Delta table
#   - Direct Vector Access: caller provides pre-computed vectors (not used here)
#   - Triggered sync: one-shot, on-demand refresh
#   - Continuous sync: streams new data into the index as it lands
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = spark.conf.get("catalog_name", "main")
schema_prefix = spark.conf.get("schema_prefix", "dbsword_medtech")

silver_table = f"{catalog}.{schema_prefix}_silver.paper_chunks"
endpoint_name = f"medsearch-{schema_prefix.replace('dbsword_', '').replace('_', '-')}"
index_name = "papers_idx"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Ensure the Vector Search endpoint exists
# ────────────────────────────────────────────────────────────────────────────
# The endpoint is the compute pool for Vector Search. On Free Edition, you
# get 1 endpoint per workspace. If a prior mission (or prior deploy) left
# one behind, this CREATE will fail with a clear error.

from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient()

try:
    endpoint = vsc.create_endpoint(
        name=endpoint_name,
        endpoint_type="STANDARD"
    )
    print(f"✅ Created Vector Search endpoint: {endpoint_name}")
except Exception as e:
    if "already exists" in str(e).lower():
        print(f"ℹ️  Endpoint {endpoint_name} already exists — reusing")
    else:
        raise

# COMMAND ----------

# ───────────────────────────────────────────────────────────────────��────────
# SECTION 2: Create the Vector Search index
# ────────────────────────────────────────────────────────────────────────────
# Delta Sync Index reads from the source Delta table, computes embeddings
# using the specified model, and keeps the index in sync.
#
# ⚠️ BUG: The CREATE statement below is missing the SYNC SCHEDULE clause.
# Without it, the index never syncs to the source table.

# ⚠️ BUG: Missing SYNC SCHEDULE
create_index_sql = f"""
CREATE VECTOR INDEX IF NOT EXISTS {catalog}.{schema_prefix}_silver.{index_name}
ON TABLE {silver_table}
(text)
USING EMBEDDING_MODEL 'databricks-bge-large-en-v1.5'
"""

print(f"🔧 Creating index with SQL:\n{create_index_sql}")

spark.sql(create_index_sql)
print(f"✅ Index {index_name} created")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Wait for initial sync
# ────────────────────────────────────────────────────────────────────────────
# After CREATE VECTOR INDEX, the initial sync can take a few minutes.
# Without a SYNC SCHEDULE, this wait will time out.

import time

print("⏳ Waiting for initial sync (max 5 minutes)...")
for i in range(30):
    state = vsc.get_index(endpoint_name, index_name).describe()["status"]["state"]
    print(f"   [{i*10}s] index state: {state}")
    if state == "ONLINE":
        print(f"✅ Index is online after {i*10}s")
        break
    time.sleep(10)
else:
    print(f"❌ Index never reached ONLINE state")
    print("   HINT: The CREATE statement is missing 'SYNC SCHEDULE EVERY 1 HOUR'.")
    print("         Without it, the index never syncs from the source table.")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Test the index with a sample query
# ────────────────────────────────────────────────────────────────────────────

try:
    results = vsc.get_index(endpoint_name, index_name).similarity_search(
        num_results=3,
        columns=["text", "title"],
        query_text="HER2 breast cancer treatment"
    )
    chunks = results.get("result", {}).get("data_array", [])
    print(f"✅ Test query returned {len(chunks)} chunks")
    for c in chunks[:2]:
        print(f"   📄 {c[1]}: {c[0][:100]}…")
except Exception as e:
    print(f"❌ Test query failed: {e}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Missing SYNC SCHEDULE
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   CREATE VECTOR INDEX statement is missing the SYNC SCHEDULE clause.
#   Without it, the index is created but never syncs to the source table.
#
# TO FIX:
#   Add the SYNC SCHEDULE clause to the CREATE statement:
#     CREATE VECTOR INDEX IF NOT EXISTS ….{index_name}
#     ON TABLE {silver_table} (text)
#     USING EMBEDDING_MODEL 'databricks-bge-large-en-v1.5'
#     SYNC SCHEDULE EVERY 1 HOUR
#
# CONCEPTS LEARNED:
#   1. Delta Sync Index reads from a source Delta table automatically
#   2. SYNC SCHEDULE defines how often the index syncs (Triggered / Continuous)
#   3. Endpoint is the compute pool — 1 per workspace on Free Edition
#   4. similarity_search() returns top-k chunks by vector distance
#
# MISSION COMPLETE when the index reaches ONLINE state and a test query succeeds! 🏆
# ────────────────────────────────────────────────────────────────────────────