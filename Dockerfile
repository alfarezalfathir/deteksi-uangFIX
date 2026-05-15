FROM node:22-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip3 install --break-system-packages -r requirements.txt

COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm install --omit=dev

WORKDIR /app

COPY . .

RUN chmod +x start.sh

CMD ["./start.sh"]