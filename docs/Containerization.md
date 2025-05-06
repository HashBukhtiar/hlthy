**Run AI Backend Locally (for Testing)**

To test the Python Flask AI backend (`ai/vertex_testing.py`) locally without Docker:

1.  **Ensure Python dependencies are installed:**
    ```bash
    pip install -r requirements.txt
    ```
2.  **Set up Google Cloud Authentication:** Make sure you have authenticated locally so the script can access Vertex AI.
    ```bash
    # Run this once if you haven't already
    gcloud auth application-default login
    ```
3.  **Run the Flask server directly:**
    ```bash
    python ai/vertex_testing.py
    ```
    The server will start, usually listening on `http://0.0.0.0:5001`.
4.  **Test the endpoint (in a separate terminal):**
    ```bash
    # Using curl
    curl -X POST http://localhost:5001/api/ask -H "Content-Type: application/json" -d '{"prompt": "Hello, when was Python created?"}'

    # Or using PowerShell
    Invoke-RestMethod -Uri http://localhost:5001/api/ask -Method Post -ContentType 'application/json' -Body '{"prompt": "Hello, when was Python created?"}'
    ```

**Dockerizing and Deploying the AI Backend to Cloud Run**

The AI backend runs as a containerized service on Google Cloud Run.

**Building the Docker Image**

When you make changes to the Python code (primarily `ai/vertex_testing.py`) or its dependencies (`requirements.txt`), you need to build a new Docker image.

```bash
# Build the image, tagging it for Google Container Registry (GCR)
docker build -t gcr.io/hlthy-project-id/hlthy-ai:latest .
```

*Optional: Cleaning up Docker build cache if you encounter issues:*

```bash
# Prune old build cache (use with caution, removes unused cache)
docker builder prune -a

# Force a rebuild without using any cache (slower)
docker build --no-cache -t gcr.io/hlthy-project-id/hlthy-ai:latest .
```

**Testing the Docker Image Locally (Optional but Recommended)**

Before pushing to Cloud Run, you can run the container locally to verify it works.

1.  **Run the container:** Map a local port (e.g., 5000) to the container's port (5001).
    ```bash
    # Run in detached mode, map port 5000 to 5001, name the container
    docker run -d -p 5000:5001 --name hlthy-ai-container gcr.io/hlthy-project-id/hlthy-ai:latest
    ```
2.  **Test the running container (in a separate terminal):** Use the *mapped* local port (5000 in this example).
    ```bash
    # Using curl
    curl -X POST http://localhost:5000/api/ask -H "Content-Type: application/json" -d '{"prompt": "Test prompt for container"}'

    # Or using PowerShell
    Invoke-RestMethod -Uri http://localhost:5000/api/ask -Method Post -ContentType 'application/json' -Body '{"prompt": "Test prompt for container"}'
    ```
3.  **View container logs:**
    ```bash
    docker logs hlthy-ai-container
    ```
4.  **Stop and remove the test container:**
    ```bash
    docker stop hlthy-ai-container
    docker rm hlthy-ai-container
    ```

**Deploying Changes to Cloud Run**

After building a new image with your changes and (optionally) testing it locally, follow these steps to deploy it to Cloud Run:

1.  **Authenticate Docker with Google Cloud Artifact Registry/GCR:**
    You only need to do this once per region or if authentication expires.
    ```bash
    gcloud auth configure-docker northamerica-northeast2-docker.pkg.dev
    ```
2.  **Push the Docker Image:** Upload the newly built image to Google Container Registry.
    ```bash
    docker push gcr.io/hlthy-project-id/hlthy-ai:latest
    ```
3.  **Deploy to Cloud Run:** Tell Cloud Run to create a new revision of your service using the image you just pushed.
    ```bash
    gcloud run deploy hlthy-ai-service --image gcr.io/hlthy-project-id/hlthy-ai:latest --platform managed --region northamerica-northeast2 --allow-unauthenticated --port 5001
    ```

**Summary: What to do after changing Python code (`ai/vertex_testing.py`)**

Every time you modify `ai/vertex_testing.py` or `requirements.txt`:

1.  **Build** the Docker image: `docker build -t gcr.io/hlthy-project-id/hlthy-ai:latest .`
2.  **(Optional)** Test the container locally.
3.  **Push** the Docker image: `docker push gcr.io/hlthy-project-id/hlthy-ai:latest`
4.  **Deploy** to Cloud Run: `gcloud run deploy hlthy-ai-service --image gcr.io/hlthy-project-id/hlthy-ai:latest ...` (use the full command)