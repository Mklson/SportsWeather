FROM eclipse-temurin:17-jre-jammy

ARG GH_VERSION=8.0
WORKDIR /gh

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN curl -L -o graphhopper.jar \
    "https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar"

COPY config.yml /gh/config.yml
COPY custom_models /gh/custom_models
COPY start.sh /gh/start.sh
RUN chmod +x /gh/start.sh

EXPOSE 8989
ENTRYPOINT ["/gh/start.sh"]
