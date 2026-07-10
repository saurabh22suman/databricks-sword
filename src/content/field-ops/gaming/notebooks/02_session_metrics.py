# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_session_metrics.py
# MISSION:  Gaming — Player Engagement Analytics
# STATUS:   BROKEN — Session duration calculation is wrong
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Calculate player session metrics: duration, events per session,
#   and revenue per session. The session boundary detection uses
#   LAG/LEAD window functions to pair session_start and session_end events.
#
# WHAT YOU'LL LEARN:
#   ✅ LAG() and LEAD() window functions (PySpark + SQL)
#   ✅ Session boundary detection from event streams
#   ✅ Time difference calculations (unix_timestamp)
#   ✅ Aggregation: SUM, AVG, COUNT within windows
#   ✅ SQL CTEs vs PySpark method chaining
#
# INPUT:
#   Table: {catalog}.{schema_prefix}_bronze.player_events
#
# OUTPUT:
#   Table: {catalog}.{schema_prefix}_silver.sessions
#
# HINTS:
#   - Session duration should be END - START, not START - END
#   - The BUG produces negative durations — look at the subtraction order
#   - Think about edge cases: what if a session has no end event?
#
# DOCUMENTATION:
#   - Window functions: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.lag.html
#   - SQL LEAD/LAG:     https://docs.databricks.com/en/sql/language-manual/functions/lead.html
#   - unix_timestamp:   https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.unix_timestamp.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────────────────────────

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Event Data
# ────────────────────────────────────────────────────────────────────────────

df_events = spark.read.table(f"{bronze_schema}.player_events")

print(f"📊 Total events: {df_events.count()}")
print(f"📊 Event types: {[r['event_type'] for r in df_events.select('event_type').distinct().collect()]}")

# Show session-related events
df_events.filter("event_type IN ('session_start', 'session_end')").orderBy("player_id", "event_ts").show(20, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Session Duration — PySpark Window Functions
# ────────────────────────────────────────────────────────────────────────────
# Strategy: Filter to session_start events, then use LEAD() to find the
# next session_end event for the same player. Calculate time difference.
#
# LEAD(column, offset) returns the value from a subsequent row within
# the same partition. This lets us look ahead to find the session_end
# that follows each session_start.

from pyspark.sql.window import Window
from pyspark.sql.functions import (
    col, lead, lag, unix_timestamp, when, count, sum as spark_sum,
    avg, round as spark_round, current_timestamp
)

# Window: partition by player, order by time
player_window = Window.partitionBy("player_id").orderBy("event_ts")

# Get session boundaries by pairing start with next end
df_session_events = (
    df_events
    .filter("event_type IN ('session_start', 'session_end')")
    .withColumn("next_event_type", lead("event_type").over(player_window))
    .withColumn("next_event_ts", lead("event_ts").over(player_window))
)

df_session_events.show(20, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: Calculate Session Duration
# ────────────────────────────────────────────────────────────────────────────
#
# ⚠️ BUG BELOW: Duration is calculated as START - END instead of END - START.
# This produces NEGATIVE durations for all sessions.
# HINT: The subtraction order matters! End timestamp is always AFTER start.

df_sessions = (
    df_session_events
    .filter("event_type = 'session_start' AND next_event_type = 'session_end'")
    .withColumn(
        "duration_minutes",
        spark_round(
            (unix_timestamp("event_ts") - unix_timestamp("next_event_ts")) / 60,  # ⚠️ BUG: Should be next - current
            2
        )
    )
    .select(
        col("player_id"),
        col("session_id"),
        col("event_ts").alias("session_start"),
        col("next_event_ts").alias("session_end"),
        col("duration_minutes"),
        col("platform"),
        col("game_version"),
        col("event_date").alias("session_date"),
    )
)

print(f"📊 Sessions found: {df_sessions.count()}")
df_sessions.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL Equivalent — Session Duration with CTEs
# ────────────────────────────────────────────────────────────────────────────
# SQL CTEs (WITH ... AS) make complex queries readable. This achieves the
# same result as the PySpark approach above.
#
# ⚠️ SAME BUG: Subtraction order is reversed in the SQL version too.

df_sessions_sql = spark.sql(f"""
    WITH session_events AS (
        SELECT
            player_id,
            session_id,
            event_type,
            event_ts,
            event_date,
            platform,
            game_version,
            LEAD(event_type) OVER (
                PARTITION BY player_id ORDER BY event_ts
            ) AS next_event_type,
            LEAD(event_ts) OVER (
                PARTITION BY player_id ORDER BY event_ts
            ) AS next_event_ts
        FROM {bronze_schema}.player_events
        WHERE event_type IN ('session_start', 'session_end')
    )
    SELECT
        player_id,
        session_id,
        event_ts AS session_start,
        next_event_ts AS session_end,
        ROUND(
            (UNIX_TIMESTAMP(event_ts) - UNIX_TIMESTAMP(next_event_ts)) / 60,  -- ⚠️ BUG
            2
        ) AS duration_minutes,
        platform,
        game_version,
        event_date AS session_date
    FROM session_events
    WHERE event_type = 'session_start'
      AND next_event_type = 'session_end'
""")

df_sessions_sql.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Enrich Sessions with Event Counts and Revenue
# ────────────────────────────────────────────────────────────────────────────
# Count events per session and calculate revenue per session.

df_event_metrics = (
    df_events
    .groupBy("session_id")
    .agg(
        count("*").alias("events_in_session"),
        spark_sum(when(col("event_type") == "purchase", col("amount")).otherwise(0)).alias("session_revenue"),
        count(when(col("event_type") == "purchase", True)).alias("purchase_count"),
        count(when(col("event_type") == "level_up", True)).alias("levelups_in_session"),
    )
)

# Join metrics with session data
df_sessions_enriched = (
    df_sessions
    .join(df_event_metrics, "session_id", "left")
    .withColumn("_updated_at", current_timestamp())
)

df_sessions_enriched.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Write Silver Sessions Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_sessions_enriched
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.sessions")
)

print(f"✅ Silver sessions written: {silver_schema}.sessions")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Also Create Silver Events Table (cleaned)
# ────────────────────────────────────────────────────────────────────────────
# A deduplicated, type-safe events table for downstream use.

(
    df_events
    .dropDuplicates(["event_id"])
    .withColumn("_updated_at", current_timestamp())
    .write
    .mode("overwrite")
    .saveAsTable(f"{silver_schema}.events")
)

print(f"✅ Silver events written: {silver_schema}.events")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Validation
# ────────────────────────────────────────────────────────────────────────────

# Check: No negative durations (this will FAIL until the bug is fixed)
negative_check = spark.sql(f"""
    SELECT COUNT(*) AS negative_sessions
    FROM {silver_schema}.sessions
    WHERE duration_minutes < 0
""")

neg_count = negative_check.collect()[0]["negative_sessions"]
print(f"🔍 Sessions with negative duration: {neg_count}")
print(f"{'✅' if neg_count == 0 else '❌'} Duration validation {'PASSED' if neg_count == 0 else 'FAILED — fix the subtraction order!'}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Session duration is calculated as START - END (negative) instead of
#   END - START (positive). Fix it in both the PySpark (Section 2B) and
#   SQL (Section 3) versions.
#
# TO FIX:
#   Change: unix_timestamp("event_ts") - unix_timestamp("next_event_ts")
#   To:     unix_timestamp("next_event_ts") - unix_timestamp("event_ts")
#
# CONCEPTS LEARNED:
#   1. LEAD() / LAG() for looking ahead/behind in ordered data
#   2. Window partitioning by player, ordering by timestamp
#   3. Session boundary detection from event streams
#   4. SQL CTEs for readable multi-step queries
#   5. Event aggregation per session
#
# NEXT → 03_retention_cohorts.py — Build D1/D7/D30 retention analysis
# ────────────────────────────────────────────────────────────────────────────
