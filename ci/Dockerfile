ARG ARG_FROM_IMAGE=node
ARG ARG_FROM_IMAGE_TAG=lts

# base image
FROM ${ARG_FROM_IMAGE}:${ARG_FROM_IMAGE_TAG} as builder

# The application depends on PolkADAPT, so we have to install and build PolkADAPT first.
WORKDIR /app/polkadapt

# Copy all PolkADAPT package.json files and install packages.

COPY polkadapt/package.json .
RUN npm i

COPY polkadapt/projects/core/package.json projects/core/package.json
RUN cd projects/core && npm i

# We build the core libary first, because PolkADAPT adapters depend on it.

COPY polkadapt/angular.json polkadapt/tsconfig.json ./
COPY polkadapt/projects/core projects/core
RUN npm exec ng build -- --configuration production core

COPY polkadapt/projects/substrate-rpc/package.json projects/substrate-rpc/package.json
RUN cd projects/substrate-rpc && npm i

COPY polkadapt/projects/polkascan-explorer/package.json projects/polkascan-explorer/package.json
RUN cd projects/polkascan-explorer && npm i

COPY polkadapt/projects/coingecko/package.json projects/coingecko/package.json
RUN cd projects/coingecko && npm i

COPY polkadapt/projects/subsquid/package.json projects/subsquid/package.json
RUN cd projects/subsquid && npm i

# Copy the rest of the files and build all PolkADAPT libraries.

COPY polkadapt .
RUN npm exec ng build -- --configuration production substrate-rpc
RUN npm exec ng build -- --configuration production polkascan-explorer
RUN npm exec ng build -- --configuration production coingecko
RUN npm exec ng build -- --configuration production subsquid

# Install the application dependencies.
WORKDIR /app

COPY package.json .
RUN npm i

# Copy the rest of the files and build the application.
COPY . .

ARG ENV_CONFIG=production
ENV ENV_CONFIG=$ENV_CONFIG

RUN npm exec ng build -- --configuration ${ENV_CONFIG}


# STAGE 2: Nginx setup to serve the application.

FROM nginx:stable

ARG ARG_GOSU_VERSION=1.16
ARG ARG_TINI_VERSION=v0.19.0

ENV GOSU_VERSION="${ARG_GOSU_VERSION}" \
    TINI_VERSION="${ARG_TINI_VERSION}"

SHELL ["/bin/bash", "-c"]

COPY ci/docker-entrypoint.sh /usr/local/bin/entrypoint.sh

RUN set -eEuo pipefail \
    && apt-get update \
    && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install apt-utils \
    && DEBIAN_FRONTEND=noninteractive apt-get -y dist-upgrade \
    && DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends install wget git vim ca-certificates gnupg software-properties-common lsb-release curl pigz btrfs-progs \
    && savedAptMark="$(apt-mark showmanual)" \
    && if ! command -v gosu &> /dev/null; then \
      if ! command -v gpg2 &> /dev/null; then \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gnupg2 dirmngr; \
      fi \
      && dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')" \
      && curl -sSfL "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch" > /usr/local/bin/gosu \
      && curl -sSfL "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc" > /usr/local/bin/gosu.asc \
      && export GNUPGHOME="$(mktemp -d)" \
      && ( gpg2 --batch --keyserver hkps://keys.openpgp.org --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 || \
       gpg2 --batch --keyserver hkps://keyserver.ubuntu.com:443 --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 || \
       gpg2 --batch --keyserver pgp.mit.edu --recv-key B42F6819007F00F88E364FD4036A9C25BF357DD4 ) \
      && gpg2 --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
      && ( gpgconf --kill dirmngr || true ) \
      && ( gpgconf --kill gpg-agent || true ) \
      && rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc \
      && unset GNUPGHOME \
      && chmod +x /usr/local/bin/gosu \
      && gosu --version; \
    fi \
    && if ! command -v tini &> /dev/null; then \
      if ! command -v gpg2 &> /dev/null; then \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gnupg2 dirmngr; \
      fi \
      && curl -sSfL "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini" > /usr/local/bin/tini \
      && curl -sSfL "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini.asc" > /usr/local/bin/tini.asc \
      && export GNUPGHOME="$(mktemp -d)" \
      && ( gpg2 --batch --keyserver hkps://keys.openpgp.org --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 || \
       gpg2 --batch --keyserver hkps://keyserver.ubuntu.com:443 --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 || \
       gpg2 --batch --keyserver pgp.mit.edu --recv-key 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 ) \
      && gpg2 --batch --verify /usr/local/bin/tini.asc /usr/local/bin/tini \
      && ( gpgconf --kill dirmngr || true ) \
      && ( gpgconf --kill gpg-agent || true ) \
      && rm -rf "$GNUPGHOME" /usr/local/bin/tini.asc \
      && unset GNUPGHOME \
      && chmod +x /usr/local/bin/tini \
      && tini --version; \
    fi \
    && apt-mark auto '.*' &> /dev/null && [ -z "$savedAptMark" ] || apt-mark manual $savedAptMark &> /dev/null \
    && rm -rf /var/cache/apt/archives/*.deb /var/lib/apt/lists/* /root/.cache /tmp/*

# Allow for various nginx proxy configuration.
ARG NGINX_CONF=nginx/explorer-ui.conf
ENV NGINX_CONF=$NGINX_CONF

# Remove default nginx configs.
RUN rm -rf /etc/nginx/conf.d/*

# Copy the nginx config.
COPY ${NGINX_CONF} /etc/nginx/conf.d/

# Remove default nginx website.
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from ‘builder’ stage to default nginx public folder.
COPY --from=builder /app/dist/explorer-ui /usr/share/nginx/html

# Copy config.json file for runtime environment variables.
ARG CONFIG_JSON=src/assets/config.json
ENV CONFIG_JSON=$CONFIG_JSON
COPY $CONFIG_JSON /usr/share/nginx/html/assets/config.json

# Copy privacy-policy.html file.
ARG PRIVACY_POLICY_HTML=src/assets/privacy-policy.html
ENV PRIVACY_POLICY_HTML=$PRIVACY_POLICY_HTML
COPY $PRIVACY_POLICY_HTML /usr/share/nginx/html/assets/privacy-policy.html

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]

CMD ["/bin/bash",  "-c",  "exec nginx -g 'daemon off;'"]