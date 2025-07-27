import vertex_testing
import os

# This is the main entry point for Cloud Run
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    vertex_testing.app.run(host="0.0.0.0", port=port)
