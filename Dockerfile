FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy frontend package files and install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all source code
COPY . .

# Build Angular frontend
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["node", "server.js"]
