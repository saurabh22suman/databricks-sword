"""
Streamlit RAG app for Medical Research Discovery.

Reads from the Vector Search index built in notebook 03 and queries
the foundation model endpoint declared in databricks.yml. Designed to run
on Databricks Apps (Free Edition compatible).

Environment variables set by the DAB deploy:
- CATALOG: Unity Catalog name (e.g., "main")
- SCHEMA_PREFIX: medtech-research schema prefix (e.g., "dbsword_medtech")
- VS_ENDPOINT: Vector Search endpoint name
- FOUNDATION_MODEL: Model serving endpoint name
"""

import os
import requests
import streamlit as st
from databricks.vector_search.client import VectorSearchClient
from databricks.sdk import WorkspaceClient

CATALOG = os.environ.get("CATALOG", "main")
SCHEMA_PREFIX = os.environ.get("SCHEMA_PREFIX", "dbsword_medtech")
VS_ENDPOINT = os.environ.get("VS_ENDPOINT", "medsearch-medtech")
FOUNDATION_MODEL = os.environ.get(
    "FOUNDATION_MODEL", "databricks-llama-3.1-8b-instruct"
)
INDEX_NAME = "papers_idx"

st.set_page_config(page_title="Medical Research Discovery", page_icon="🧬", layout="wide")
st.title("🧬 Medical Research Discovery")
st.caption(
    "Ask questions about treatments, drugs, conditions. Answers are grounded in PubMed abstracts."
)

w = WorkspaceClient()
vsc = VectorSearchClient()


@st.cache_resource
def get_index():
    return vsc.get_index(endpoint_name=VS_ENDPOINT, index_name=INDEX_NAME)


q = st.text_input(
    "Your question:",
    placeholder="What are the latest treatments for HER2-positive breast cancer?",
)

if q:
    with st.spinner("Searching medical literature…"):
        try:
            # 1. Retrieve top-5 chunks from Vector Search
            index = get_index()
            results = index.similarity_search(
                num_results=5,
                columns=["text", "title", "year"],
                query_text=q,
            )
            chunks = results.get("result", {}).get("data_array", [])
            context = "\n\n---\n\n".join(c[0] for c in chunks)

            # 2. Call foundation model with context
            resp = requests.post(
                f"{w.config.host}/serving-endpoints/{FOUNDATION_MODEL}/invocations",
                headers={"Authorization": f"Bearer {w.config.token}"},
                json={
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a medical research assistant. Answer based only on the "
                                "provided context. Cite paper titles in parentheses. If the context "
                                "doesn't contain the answer, say so."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"Context:\n{context}\n\nQuestion: {q}",
                        },
                    ],
                    "max_tokens": 500,
                },
                timeout=30,
            )
            resp.raise_for_status()
            answer = resp.json()["choices"][0]["message"]["content"]

            st.markdown("### Answer")
            st.write(answer)

            with st.expander(f"📚 Sources ({len(chunks)} papers)"):
                for c in chunks:
                    st.markdown(f"**{c[1]}** ({c[2]}) — {c[0][:200]}…")
        except Exception as e:
            st.error(f"Error: {e}")
            st.info(
                "Common causes: Vector Search index not yet online, foundation model endpoint "
                "still starting up, or the entry point path in your DAB bundle is wrong (must be "
                "`./app.py` at the bundle root, not in a subdirectory)."
            )