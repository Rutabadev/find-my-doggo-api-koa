FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json yarn.lock ./

USER node

# ~ equivalent to npm ci
RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

RUN yarn build

EXPOSE 3001

CMD [ "yarn", "start" ]