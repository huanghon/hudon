FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV SEED_CONFIG_FILE=/app/data.seed/site-config.json

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY data ./data
COPY data ./data.seed

RUN addgroup -S app \
  && adduser -S app -G app \
  && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
