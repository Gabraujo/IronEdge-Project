FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/backend-*.jar app.jar

EXPOSE 8080
CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
