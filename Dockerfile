# ---- HostelHub image ----
FROM node:20-alpine
WORKDIR /app

# Install only production dependencies (cached unless package.json changes)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the source code
COPY . .

ENV NODE_ENV=production PORT=5000
EXPOSE 5000

# Run as a non-root user for safety
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["npm", "start"]
