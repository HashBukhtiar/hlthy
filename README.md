# hlthy
The intersection of fitness and social media.

**Partners**  
Andrew De Rango  
Hashim Bukhtiar  
Matthew Martel  
Matthew Wood  
Nehad Shikh Trab  

**Run in a Development Environment**

Run the following commands to create an Expo instance for testing and development purposes. 

```
npm install
```

This will ensure your local device has the most up-to-date packages and dependencies.

```
npx expo start
```

This will create an Expo instance and give you a QR code to scan with your mobile device and run the app.

**Dockerize the Development Environment**

Run the following commands to create a Docker container and build the app image. The `hlthy-project-id` can be found in GCP.

```
docker build -t gcr.io/hlthy-project-id/hlthy-ai:latest .
```

Then, run the Docker container locally.

```
docker run -d -p 5000:5000 --name hlthy-ai-container gcr.io/hlthy-project-id/hlthy-ai:latest
```

To specifically test AI functionality, ensure that you have installed, set up, and logged into `gcloud`. Open a new terminal and run the Flask server.

```
python3 ai/vertex_testing.py
```

Then, in another terminal, use the following command to see if Vertex AI responds to prompts. Feel free to change the prompt accordingly.

```
curl -X POST http://localhost:5000/api/ask \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello from Docker!"}'
```

The expected response is something like this:

```
{
  "text": "Hello! I'm deployed in a Docker container. How can I assist you today?"
}
```

To view logs from the container that is running:

```
docker logs hlthy-ai-container
```

Once the testing and development session is complete, stop and remove the container.

```
docker stop hlthy-ai-container
docker rm hlthy-ai-container
```