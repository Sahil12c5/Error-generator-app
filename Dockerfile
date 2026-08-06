FROM node:18-alpine

WORKDIR /app

# Install Java JRE so the agent can run
RUN apk add --no-cache openjdk17-jre

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy all application files (including the .jar)
COPY . .

EXPOSE 3000

# 1. Run the Java log agent in the background (&) pointing to your Localtunnel
# 2. Run the Node app and route all console output into /app/app.log
CMD ["/bin/sh", "-c", "java -jar log-agent.jar --api-key=\"\" --log-file=/app/app.log --server-url=https://orange-memes-fetch.loca.lt/api/v1/logs/ingest & npm start > /app/app.log 2>&1"]