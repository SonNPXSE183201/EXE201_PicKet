# syntax=docker/dockerfile:1
FROM dart:3.12.0 AS build

ARG DART_FROG_VERSION=1.2.14
ENV PATH="/root/.pub-cache/bin:${PATH}"
WORKDIR /src

COPY pubspec.yaml pubspec.lock ./
RUN dart pub get
RUN dart pub global activate dart_frog_cli "${DART_FROG_VERSION}"

COPY . .
RUN dart_frog build
WORKDIR /src/build
RUN mkdir -p /out \
    && dart pub get --offline \
    && dart compile exe bin/server.dart -o /out/picket-api

FROM scratch AS runtime
COPY --from=build /runtime/ /
COPY --from=build /out/picket-api /app/picket-api
COPY --from=build /src/build/public /public

WORKDIR /
USER 65532:65532
ENV APP_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/app/picket-api"]
