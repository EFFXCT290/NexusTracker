FROM node:16 AS builder
ARG SENTRY_AUTH_TOKEN
ENV NODE_ENV=production
ENV SENTRY_ORG=EFFXCT290
ENV SENTRY_PROJECT=nexustracker-frontend
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
WORKDIR /nexustracker
COPY . .
RUN yarn install
RUN echo "{}" > /config.js
RUN ./node_modules/.bin/next build

FROM node:16-alpine
ENV NODE_ENV=production
ENV SENTRY_DSN="https://22bc43683da04040aa90e7683ffe022a@o140996.ingest.sentry.io/4504646040616960"
LABEL org.opencontainers.image.source=https://github.com/EFFXCT290/NexusTracker
WORKDIR /nexustracker/client
COPY --from=builder /nexustracker/node_modules ./node_modules
COPY --from=builder /nexustracker/public ./public
COPY --from=builder /nexustracker/.next ./.next
COPY --from=builder /nexustracker/next.config.js ./next.config.js
COPY --from=builder /nexustracker/package.json ./package.json
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
