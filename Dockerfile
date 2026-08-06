FROM node:18-alpine

WORKDIR /app

# 1. Install Java and Unzip
RUN apk add --no-cache openjdk17-jre unzip

# 2. Install Node dependencies
COPY package*.json ./
RUN npm install

# 3. Copy project files (including log-agent.jar)
COPY . .

# 4. Extract the WAR-formatted JAR
RUN unzip -o log-agent.jar -d /app/agent

EXPOSE 3000

# 5. Run the Java agent using -cp (classpath) pointing to WEB-INF classes + start Node
CMD ["/bin/sh", "-c", "java -cp '/app/agent/WEB-INF/classes:/app/agent/WEB-INF/lib/*' com.autoheal.agent.LogAgent --api-key=\"\" --log-file=/app/app.log --server-url=https://orange-memes-fetch.loca.lt/api/v1/logs/ingest & npm start > /app/app.log 2>&1"]