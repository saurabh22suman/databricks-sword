# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_retention_cohorts.py
# MISSION:  Gaming — Player Engagement Analytics
# STATUS:   EMPTY — Player must implement retention cohort analysis
# ════════════════════════════════════════════════════════════════════════════
#
# YOUR TASK:
#   Build a retention cohort analysis that answers:
#   "What percentage of players return on Day 1, Day 7, and Day 30?"
#
# BUSINESS QUESTION:
#   NeoQuest Online is losing players. Product needs to understand
#   retention curves to identify where players churn.
#
# INPUT TABLES:
#   - {catalog}.{schema_prefix}_silver.events
#     Columns: event_id, player_id, event_type, event_ts, event_date
#   - {catalog}.{schema_prefix}_silver.sessions
#     Columns: session_id, player_id, session_start, session_end, duration_minutes
#
# OUTPUT TABLE:
#   - {catalog}.{schema_prefix}_gold.retention_cohorts
#     Required columns:
#       cohort_date      DATE   — The date players first appeared
#       retention_day    INT    — 1, 7, or 30
#       cohort_size      INT    — Total players in this cohort
#       retained_players INT    — Players active on retention_day
#       retention_rate   DOUBLE — retained_players / cohort_size
#
# ALGORITHM:
#   1. Find each player's FIRST activity date (= their cohort_date)
#   2. For each cohort, check which players were active on Day 1, 7, 30
#   3. Calculate retention_rate = active_on_day / cohort_size
#
# APPROACHES — Try BOTH:
#
# APPROACH A — SQL with CTEs (common in analytics):
#
#   WITH player_first_day AS (
#       SELECT player_id, MIN(event_date) AS cohort_date
#       FROM {silver_schema}.events
#       GROUP BY player_id
#   ),
#   player_activity AS (
#       SELECT DISTINCT player_id, event_date AS active_date
#       FROM {silver_schema}.events
#   ),
#   retention AS (
#       SELECT
#           pf.cohort_date,
#           DATEDIFF(pa.active_date, pf.cohort_date) AS days_since_first,
#           COUNT(DISTINCT pa.player_id) AS retained_players
#       FROM player_first_day pf
#       JOIN player_activity pa ON pf.player_id = pa.player_id
#       WHERE DATEDIFF(pa.active_date, pf.cohort_date) IN (1, 7, 30)
#       GROUP BY pf.cohort_date, DATEDIFF(pa.active_date, pf.cohort_date)
#   ),
#   cohort_sizes AS (
#       SELECT cohort_date, COUNT(*) AS cohort_size
#       FROM player_first_day
#       GROUP BY cohort_date
#   )
#   SELECT
#       r.cohort_date,
#       r.days_since_first AS retention_day,
#       cs.cohort_size,
#       r.retained_players,
#       ROUND(r.retained_players / cs.cohort_size, 4) AS retention_rate
#   FROM retention r
#   JOIN cohort_sizes cs ON r.cohort_date = cs.cohort_date
#
# APPROACH B — PySpark DataFrame API:
#
#   from pyspark.sql.functions import min, datediff, countDistinct
#
#   # Step 1: Player first day
#   df_first_day = df_events.groupBy("player_id").agg(min("event_date").alias("cohort_date"))
#
#   # Step 2: Distinct activity days per player
#   df_activity = df_events.select("player_id", "event_date").distinct()
#
#   # Step 3: Join and calculate days since first visit
#   df_retention = (
#       df_first_day.join(df_activity, "player_id")
#       .withColumn("days_since_first", datediff("event_date", "cohort_date"))
#       .filter(col("days_since_first").isin(1, 7, 30))
#       .groupBy("cohort_date", "days_since_first")
#       .agg(countDistinct("player_id").alias("retained_players"))
#   )
#
# RESOURCES:
#   - Cohort Analysis:  https://en.wikipedia.org/wiki/Cohort_analysis
#   - DATEDIFF:         https://docs.databricks.com/en/sql/language-manual/functions/datediff.html
#   - Window Functions: https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-window.html
#
# TIP: Start by identifying each player's first activity date, then
# check which days they returned on.
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

RETENTION_DAYS = [1, 7, 30]  # D1, D7, D30

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load and Explore Silver Data
# ────────────────────────────────────────────────────────────────────────────

df_events = spark.read.table(f"{silver_schema}.events")

print(f"📊 Total events: {df_events.count()}")
print(f"📊 Unique players: {df_events.select('player_id').distinct().count()}")

# Date range
display(spark.sql(f"""
    SELECT
        MIN(event_date) AS first_date,
        MAX(event_date) AS last_date,
        DATEDIFF(MAX(event_date), MIN(event_date)) AS date_span_days,
        COUNT(DISTINCT player_id) AS total_players
    FROM {silver_schema}.events
"""))

# COMMAND ----------

# ════════════════════════════════════════════════════════════════════════════
# SECTION 2: YOUR IMPLEMENTATION GOES HERE
# ════════════════════════════════════════════════════════════════════════════
#
# Build the retention cohort analysis using either PySpark or SQL.
# The output should be a DataFrame with:
#   cohort_date, retention_day, cohort_size, retained_players, retention_rate
#

# START YOUR CODE BELOW ───────────────────────────────────────────────────


# ─────────────────────────────────────────────── END YOUR CODE ───────────

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Write Gold Table (uncomment after implementing)
# ────────────────────────────────────────────────────────────────────────────

# df_retention_final.write.mode("overwrite").saveAsTable(f"{gold_schema}.retention_cohorts")
# print(f"✅ Gold retention_cohorts written: {gold_schema}.retention_cohorts")

# Or use SQL:
# spark.sql(f"""
#     CREATE OR REPLACE TABLE {gold_schema}.retention_cohorts AS
#     <your query here>
# """)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Validate Your Results
# ────────────────────────────────────────────────────────────────────────────

# Check 1: Table exists with data
try:
    df_gold = spark.read.table(f"{gold_schema}.retention_cohorts")
    print(f"✅ Check 1 PASSED: Table exists with {df_gold.count()} rows")
except Exception as e:
    print(f"❌ Check 1 FAILED: {e}")

# COMMAND ----------

# Check 2: Has all three retention days (D1, D7, D30)
try:
    days_check = spark.sql(f"""
        SELECT COUNT(DISTINCT retention_day) = 3 AS passed
        FROM {gold_schema}.retention_cohorts
        WHERE retention_day IN (1, 7, 30)
    """)
    result = days_check.collect()[0]["passed"]
    print(f"{'✅' if result else '❌'} Check 2: All retention days present — {'PASSED' if result else 'FAILED'}")
except:
    print("❌ Check 2 SKIPPED")

# COMMAND ----------

# Check 3: Retention rates are between 0 and 1
try:
    rate_check = spark.sql(f"""
        SELECT COUNT(*) = 0 AS passed
        FROM {gold_schema}.retention_cohorts
        WHERE retention_rate < 0 OR retention_rate > 1
    """)
    result = rate_check.collect()[0]["passed"]
    print(f"{'✅' if result else '❌'} Check 3: Valid retention rates — {'PASSED' if result else 'FAILED'}")
except:
    print("❌ Check 3 SKIPPED")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Visualize Retention Curve (after implementation)
# ────────────────────────────────────────────────────────────────────────────
# Use display() with charting to visualize the retention curve.
# In the Databricks chart settings:
#   - X axis: retention_day
#   - Y axis: retention_rate (avg)
#   - Group by: cohort_date

# display(spark.read.table(f"{gold_schema}.retention_cohorts"))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: EMPTY — YOUR IMPLEMENTATION NEEDED
# ────────────────────────────────────────────────────────────────────────────
# CONCEPTS TO PRACTICE:
#   1. SQL CTEs for multi-step analytics queries
#   2. DATEDIFF() for date arithmetic
#   3. Cohort analysis — a fundamental analytics pattern
#   4. COUNT(DISTINCT ...) for unique player counting
#   5. PySpark equivalent of complex SQL queries
#
# MISSION COMPLETE when all 3 checks pass! 🏆
# ────────────────────────────────────────────────────────────────────────────
