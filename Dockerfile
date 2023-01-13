FROM node:14 as dev

RUN mkdir -p /srv/app
WORKDIR /srv/app
EXPOSE 3000

ENV NODE_ENV=development
CMD ["npm", "run", "start:dev"]

# Install app dependencies
COPY package.json package-lock.json /srv/app/
# ensure package.json and lock agree
RUN npm ci

# Copy project files
COPY . /srv/app


# build production files
FROM dev as builder
RUN npm run build
RUN npm prune --production


# production/server image
FROM gcr.io/distroless/nodejs:14
WORKDIR /srv/app
EXPOSE 3000

ENV NODE_ENV=production
CMD ["dist/main.js"]

# copy built files (including built native node_modules)
COPY package.json package-lock.json /srv/app/
COPY --from=builder /srv/app/node_modules/ /srv/app/node_modules/
COPY --from=builder /srv/app/src/schema/*.graphql /srv/app/dist/schema/
COPY --from=builder /srv/app/dist/ /srv/app/dist/

USER 65532
