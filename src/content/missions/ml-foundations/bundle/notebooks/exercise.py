# Databricks notebook source
# MAGIC %md
# MAGIC # 🤖 Mission: ML Foundations
# MAGIC 
# MAGIC Welcome, Operative! This mission introduces you to **Machine Learning on Databricks** and **MLflow**.
# MAGIC 
# MAGIC ## Objectives
# MAGIC - Understand MLflow experiment tracking
# MAGIC - Train your first ML model
# MAGIC - Log parameters, metrics, and model artifacts
# MAGIC - Compare experiment runs
# MAGIC 
# MAGIC **Let's begin!**

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup

# COMMAND ----------

# MAGIC %sql
# MAGIC USE main.dbsword_ml_foundations;

# COMMAND ----------

import mlflow
import mlflow.sklearn
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.datasets import load_iris
import pandas as pd

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 1: Understanding MLflow
# MAGIC 
# MAGIC MLflow is an open-source platform for managing the ML lifecycle:
# MAGIC 
# MAGIC - **Tracking**: Log parameters, metrics, and artifacts
# MAGIC - **Models**: Package models for deployment
# MAGIC - **Registry**: Version and stage models
# MAGIC - **Projects**: Package ML code for reproducibility

# COMMAND ----------

# Set the experiment
experiment_name = "/Users/{}/dbsword-ml-foundations".format(spark.conf.get("spark.databricks.workspaceUrl", "user"))
mlflow.set_experiment(experiment_name)

print(f"Experiment: {experiment_name}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 2: Prepare Training Data

# COMMAND ----------

# Load the classic Iris dataset
iris = load_iris()
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['target'] = iris.target
df['species'] = df['target'].map({0: 'setosa', 1: 'versicolor', 2: 'virginica'})

# Preview data
display(spark.createDataFrame(df))

# COMMAND ----------

# Split data
X = df[iris.feature_names]
y = df['target']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training samples: {len(X_train)}")
print(f"Test samples: {len(X_test)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 3: Train and Log with MLflow
# MAGIC 
# MAGIC Let's train a model and log everything to MLflow.

# COMMAND ----------

# Start an MLflow run
with mlflow.start_run(run_name="random_forest_v1"):
    # Define hyperparameters
    n_estimators = 100
    max_depth = 5
    
    # Log parameters
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset", "iris")
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators, 
        max_depth=max_depth, 
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)
    
    # Log the model
    mlflow.sklearn.log_model(model, "random_forest_model")
    
    print(f"✅ Run logged successfully!")
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"   F1 Score: {f1:.4f}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 4: Experiment with Hyperparameters
# MAGIC 
# MAGIC Let's try different configurations and compare results.

# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Train with different hyperparameters
# MAGIC 
# MAGIC Train another model with:
# MAGIC - n_estimators = 200
# MAGIC - max_depth = 10

# COMMAND ----------

# TODO: Start a new MLflow run with different hyperparameters
# Hint: Use mlflow.start_run(run_name="random_forest_v2")

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 5: Compare Runs in MLflow UI
# MAGIC 
# MAGIC You can view your experiments in the MLflow UI:
# MAGIC 1. Click "Experiments" in the left sidebar
# MAGIC 2. Find your experiment
# MAGIC 3. Compare runs side-by-side

# COMMAND ----------

# MAGIC %md
# MAGIC ### Query Runs Programmatically

# COMMAND ----------

# Search runs in the current experiment
experiment = mlflow.get_experiment_by_name(experiment_name)
if experiment:
    runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id])
    display(runs[['run_id', 'params.n_estimators', 'params.max_depth', 'metrics.accuracy', 'metrics.f1_score']])

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 6: Load and Use a Logged Model

# COMMAND ----------

# Get the latest run
if experiment:
    latest_run = mlflow.search_runs(
        experiment_ids=[experiment.experiment_id], 
        order_by=["end_time DESC"],
        max_results=1
    ).iloc[0]
    
    run_id = latest_run.run_id
    print(f"Loading model from run: {run_id}")
    
    # Load the model
    loaded_model = mlflow.sklearn.load_model(f"runs:/{run_id}/random_forest_model")
    
    # Make predictions
    predictions = loaded_model.predict(X_test)
    print(f"Predictions: {predictions[:5]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 7: Register the Best Model
# MAGIC 
# MAGIC Once you're happy with a model, register it to the Model Registry.

# COMMAND ----------

# Register the model (uncomment to run)
# model_name = "dbsword_iris_classifier"
# mlflow.register_model(f"runs:/{run_id}/random_forest_model", model_name)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Mission Complete! 🎉
# MAGIC 
# MAGIC ### Key Takeaways
# MAGIC 1. **MLflow Tracking** logs parameters, metrics, and models
# MAGIC 2. **Experiments** organize related runs
# MAGIC 3. **The MLflow UI** enables visual comparison of runs
# MAGIC 4. **Model Registry** manages model versions and deployment stages

# COMMAND ----------

# MAGIC %md
# MAGIC ## Evaluation Queries

# COMMAND ----------

# Eval: At least one run was logged
if experiment:
    run_count = len(mlflow.search_runs(experiment_ids=[experiment.experiment_id]))
    print(f"Runs logged: {run_count}")
else:
    print("No experiment found")

# COMMAND ----------

# Eval: Model achieves reasonable accuracy
print(f"Model accuracy: {accuracy:.4f}")
assert accuracy > 0.9, "Model accuracy should be > 90%"
print("✅ Model meets accuracy threshold!")
