FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
CMD java -jar log-agent.jar --api-key="" --log-file=/app/app.log --server-url=http:///api/v1/logs/ingest & java -jar main-app.jar