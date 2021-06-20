ARG RUNTIME=node:16.3.0-slim

FROM ${RUNTIME} as base
WORKDIR /app
COPY src .
RUN echo "*.d.ts" >> .yarnclean && \
    echo "*.map" >> .yarnclean && \
    yarn --production

FROM ${RUNTIME}
WORKDIR /app
COPY --from=base /app .
ARG TINI_VERSION=v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
CMD ["node", "server.js"]
