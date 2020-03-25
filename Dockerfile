FROM node:13.10.1
LABEL \
        name="Beaker Dolphin" \
        maintainer="Martin Styk <martin.styk@redhat.com>" \
        license="GPLv3"
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "start"]
