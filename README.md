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

Then, run the Docker container locally. Note that the container is running on port 5000 and the Flask server is on port 5001.

```
docker run -d -p 5000:5001 --name hlthy-ai-container gcr.io/hlthy-421200/hlthy-ai:latest
```

To specifically test AI functionality, ensure that you have installed, set up, and logged into `gcloud`. Open a new terminal and run the Flask server.

```
python3 ai/vertex_testing.py
```

Then, in another terminal, use the following command to see if Vertex AI responds to prompts. Feel free to change the prompt accordingly.

```
curl -X POST http://localhost:5001/api/ask \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, when was Python created?"}'
```

The expected response is something like this:

```
{
  "text": "October 20, 1989"
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