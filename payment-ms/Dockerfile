# syntax=docker/dockerfile:1.7

FROM maven:3.9-eclipse-temurin-21 AS deps
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline

FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY --from=deps /root/.m2 /root/.m2
COPY pom.xml .
COPY src ./src
RUN mvn -B clean package -DskipTests
RUN java -Djarmode=tools -jar target/payment-ms-1.0.0.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:21-jre-alpine AS runtime

LABEL org.opencontainers.image.title="payment-ms" \
      org.opencontainers.image.description="Servicio de simulacion de cobros" \
      org.opencontainers.image.version="1.0.0"

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=builder --chown=app:app /build/extracted/dependencies/ ./
COPY --from=builder --chown=app:app /build/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=app:app /build/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=app:app /build/extracted/application/ ./

USER app
EXPOSE 8081

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseContainerSupport"

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -qO- http://localhost:8081/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
