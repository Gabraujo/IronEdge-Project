# IronEdge Mobile (APK)

Este diretorio contem o app Android via Capacitor, usando a mesma interface web do IronEdge.

## 1) Configurar backend com banco proprio

Publique o backend Spring Boot (Render, VPS, etc.) com PostgreSQL e variaveis:

- `SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:PORT/postgres?sslmode=require`
- `SPRING_DATASOURCE_USERNAME=SEU_USUARIO`
- `SPRING_DATASOURCE_PASSWORD=SUA_SENHA`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`
- `SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update`

Depois, confirme que sua URL publica abre `index.html` normalmente.

## 2) Apontar o app mobile para seu backend

Edite `mobile/capacitor.config.json` e troque:

- `https://SEU-BACKEND-AQUI.onrender.com`

pela URL real do seu backend (ex.: `https://ironedge-app.onrender.com`).

## 3) Requisitos para gerar APK

Instale:

- Android Studio
- Android SDK (API 34 ou superior)
- Java 17

No Windows, configure `ANDROID_HOME` para a pasta do SDK.

## 4) Gerar APK

Dentro de `mobile/`:

```bash
npm install
npm run sync
npm run build:debug
```

APK debug gerado em:

- `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## 5) Instalar no celular

Ative "Instalar apps desconhecidos" e instale o `app-debug.apk`.

## 6) Build de release (publicacao)

```bash
npm run build:release
```

Arquivo de release:

- `mobile/android/app/build/outputs/apk/release/app-release-unsigned.apk`

Para distribuicao, assine o APK com sua keystore.
