# Kleine hulpdienst met Docker-socket-toegang die namens de adminbackend de
# deploy-pijplijn uitvoert — zie server.js voor waarom dit een apart proces
# moet zijn (jehova-app kan zichzelf niet vervangen) en welke maatregelen
# de scope van deze verhoogde rechten beperken.
FROM node:24-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY server.js ./
ENV PORT=4000
EXPOSE 4000
CMD ["node", "server.js"]
