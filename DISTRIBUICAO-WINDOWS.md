# Distribuicao Windows (instalador .exe)

Este projeto ja roda em janela desktop (JavaFX + Spring Boot) e agora possui build automatizado para instalador Windows.

## Como gerar o instalador

No diretorio raiz do projeto, execute:

```bat
build-installer.bat
```

O script:
- compila o projeto (`mvn clean package -DskipTests`)
- gera instalador Windows com `jpackage`
- salva o arquivo em `dist\`

Exemplo de saida:

`dist\IronEdgeApp-1.0.0.exe`

## Como distribuir para outras pessoas

Envie somente o arquivo `.exe` que foi gerado em `dist\`.

Quem receber precisa apenas:
1. abrir o `.exe`
2. clicar em instalar
3. abrir o app pelo atalho criado (menu iniciar/desktop)

Nao precisa instalar Java manualmente, porque o instalador ja inclui runtime.

## Observacoes

- Gere o instalador em Windows.
- Se o Windows SmartScreen avisar sobre app nao assinado, clique em "Mais informacoes" e depois "Executar assim mesmo".
- Para uso corporativo sem aviso de assinatura, voce precisara assinar digitalmente o instalador com certificado de codigo.
