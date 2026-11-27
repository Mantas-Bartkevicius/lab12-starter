# LAB12: no external npm packages. Only app.js is needed.
FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node app.js ./app.js
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "app.js"]
