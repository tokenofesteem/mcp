# Minimal image for the Token of Esteem MCP introspection stub.
# Zero dependencies: it just runs server.js over stdio so directories can
# start it and read the tool surface.
FROM node:20-slim
WORKDIR /app
COPY server.js .
ENTRYPOINT ["node", "server.js"]
