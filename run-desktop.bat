@echo off
cd /d %~dp0
start http://localhost:8080/index.html
mvn spring-boot:run
