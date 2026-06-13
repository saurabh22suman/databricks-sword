# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_chunk_embed.py
# MISSION:  medtech-research — Medical Research Discovery
# STATUS:   BROKEN — Wrong embedding model name
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Chunk the Bronze abstracts into ~512-token pieces and compute embeddings
#   using the `ai_embed` SQL function. The Silver layer holds tokenized,
#   embedded chunks ready for Vector Search indexing.
#
# WHAT YOU'LL LEARN:
#   ✅ Chunking long text with a simple character/word splitter
#   ✅ ai_embed() SQL function for batch embedding generation
#   ✅ Vector embedding arrays in Delta tables (ArrayType(FloatType()))
#   ✅ Why chunking matters for RAG (context-window fit, retrieval precision)
#
# ⚠️ KNOWN BUG:
#   The ai_embed() call uses model name 'bge-large' (short form). The full
#   model name on Databricks is 'databricks-bge-large-en-v1.5'. The short
#   name fails with "model not found" because Free Edition requires the
#   full registry name.
#
# WHY CHUNKING:
#   - Embedding models have max input tokens (512 for BGE large)
#   - Smaller chunks → more precise retrieval
#   - Overlap between chunks preserves context across boundaries
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = spark.conf.get("catalog_name", "main")
schema_prefix = spark.conf.get("schema_prefix", "dbsword_medtech")

bronze_table = f"{catalog}.{schema_prefix}_bronze.papers_raw"
silver_table = f"{catalog}.{schema_prefix}_silver.paper_chunks"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Chunk abstracts
# ────────────────────────────────────────────────────────────────────────────
# Simple word-based chunking: split on word boundaries, target 200 words/chunk
# with 20-word overlap. Real production systems would use a tokenizer
# (e.g., tiktoken, SentencePiece) for token-accurate splits.

from pyspark.sql.functions import col, explode, split, monotonically_increasing_id, lit, concat_ws

df_papers = spark.read.table(bronze_table).select("pmid", "title", "abstract")
print(f"📊 Papers to chunk: {df_papers.count()}")

# Build chunks via SQL: each abstract → array of ~200-word chunks
df_chunks = (
    df_papers
    .selectExpr(
        "pmid",
        "title",
        "abstract",
        f"""
        slice(
            transform(
                split(abstract, ' '),
                (w, i) -> concat(
                    array_join(slice(split(abstract, ' '), greatest(i - 20, 1), 200), ' '),
                    lit('')
                )
            ),
            1, 5
        ) as chunk_texts
        """
    )
    .selectExpr("pmid", "title", "explode(chunk_texts) as text")
    .filter("length(text) > 50")
    .withColumn("chunk_id", monotonically_increasing_id())
)

print(f"📊 Total chunks: {df_chunks.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Compute embeddings with ai_embed()
# ────────────────────────────────────────────────────────────────────────────
# The ai_embed() function takes (model_name, text) and returns a vector.
# On Free Edition, use the full model name: 'databricks-bge-large-en-v1.5'.
#
# ⚠️ BUG: The model name is 'bge-large' (short form). This fails because
# Free Edition requires the full Databricks registry name.

# ⚠️ BUG: Wrong model name below
EMBEDDING_MODEL = "bge-large"  # ⚠️ BUG: should be 'databricks-bge-large-en-v1.5'

print(f"🔧 Using embedding model: {EMBEDDING_MODEL}")

# Compute embeddings via SQL
df_embedded = df_chunks.selectExpr(
    "pmid",
    "title",
    "text",
    f"ai_embed('{EMBEDDING_MODEL}', text) as embedding"
)

# Try to evaluate (this is where the bug surfaces)
try:
    sample = df_embedded.limit(1).collect()
    print(f"✅ Embedding sample: {len(sample[0]['embedding'])} dimensions")
except Exception as e:
    print(f"❌ Embedding failed: {e}")
    print("   HINT: The full model name is 'databricks-bge-large-en-v1.5'.")
    print("         Short names like 'bge-large' are not on the Free Edition registry.")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Write to Silver Delta table
# ────────────────────────────────────────────────────────────────────────────

(df_embedded.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable(silver_table))

print(f"✅ Wrote embeddings to {silver_table}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Validation
# ────────────────────────────────────────────────────────────────────────────

count_with_embeddings = (
    spark.read.table(silver_table)
    .filter("embedding IS NOT NULL")
    .count()
)
print(f"{'✅' if count_with_embeddings >= 200 else '❌'} Silver has {count_with_embeddings} embedded chunks (expected >= 200)")
if count_with_embeddings < 200:
    print("   HINT: ai_embed() failed because the model name is wrong.")
    print("         Use 'databricks-bge-large-en-v1.5' (the full Databricks registry name).")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Wrong embedding model name
# ─────────���─��────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   EMBEDDING_MODEL = "bge-large" — Free Edition requires the full name.
#
# TO FIX:
#   EMBEDDING_MODEL = "databricks-bge-large-en-v1.5"
#
# CONCEPTS LEARNED:
#   1. Chunking long text into retrieval-friendly pieces (200 words × 20 overlap)
#   2. ai_embed() SQL function for batch embeddings
#   3. Vector arrays in Delta tables (ArrayType(FloatType()))
#   4. Free Edition requires full Databricks model registry names
#
# MISSION COMPLETE when Silver validation passes (>= 200 embedded chunks)! 🏆
# ────────────────────────────────────────────────────────────────────────────