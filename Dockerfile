FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /code
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock* ./
RUN corepack enable && rm -f .yarnrc.yml && yarn config set nodeLinker node-modules && yarn install

COPY . .
# El schema tiene una ruta de salida propia del entorno actual; se elimina para el contenedor
RUN sed -i '/^\s*output\s*=/d' prisma/schema.prisma && sed -i 's/binaryTargets = .*/binaryTargets = ["native", "debian-openssl-3.0.x"]/' prisma/schema.prisma \
    && npx prisma generate && yarn build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["yarn", "start", "-p", "3000"]
