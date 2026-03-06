# Deploy Gratis: Render + Supabase

Este guia publica seu app para poucas pessoas usarem com baixo volume.

## 1) Criar banco no Supabase

1. Crie um projeto no Supabase.
2. Em `Project Settings` > `Database`, copie os dados de conexao do Postgres.
3. Monte a URL JDBC neste formato:

`jdbc:postgresql://HOST:PORT/postgres?sslmode=require`

## 2) Publicar app no Render

1. Suba seu codigo no GitHub.
2. No Render, clique em `New` > `Web Service`.
3. Conecte o repositorio.
4. Configure:
- `Environment`: `Java`
- `Build Command`: `mvn clean package -DskipTests`
- `Start Command`: `java -jar target/backend-*.jar`

## 3) Variaveis de ambiente no Render

Adicione estas variaveis:

- `SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:PORT/postgres?sslmode=require`
- `SPRING_DATASOURCE_USERNAME=SEU_USUARIO`
- `SPRING_DATASOURCE_PASSWORD=SUA_SENHA`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`
- `SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update`

## 4) Testar

1. Abra a URL publica do Render.
2. Crie uma conta e faca login.
3. Crie uma transacao e atualize a pagina para confirmar persistencia.

## Observacoes

- Sem variaveis de ambiente, seu app continua local com H2 (como antes).
- Plano gratis pode ter `sleep` quando ficar sem uso.
