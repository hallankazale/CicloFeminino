# Luna — Ciclo Feminino

Aplicativo local para acompanhamento do ciclo menstrual, sintomas, humor, histórico e previsões. A interface web existente é preservada e empacotada como aplicativo Android com Capacitor.

## Estrutura

```text
.
├── index.html                  # Aplicação atual (UI + regras existentes)
├── capacitor.config.json       # Configuração nativa Android
├── package.json                # Dependências e scripts
├── scripts/prepare-web.mjs     # Gera o bundle web para o Capacitor
├── tests/                      # Testes de regressão/smoke
└── .github/workflows/          # Build automático do APK
```

O diretório `android/` é gerado durante o build e não é versionado nesta etapa. Isso reduz arquivos gerados no repositório e mantém a fonte principal simples.

## Gerar APK localmente

Requisitos: Node.js 20+, Java 21 e Android SDK/Android Studio.

```bash
npm install
npm test
npm run prepare:web
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK gerado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Gerar APK pelo GitHub

O workflow **Build Android APK** executa testes, cria o projeto Android e publica `app-debug.apk` como artifact da execução.

## Segurança e privacidade

O Luna foi projetado para manter os registros no dispositivo e não exige conta. Entretanto, a versão web atual ainda usa `localStorage`. Como os dados registrados podem incluir informações íntimas e de saúde, a próxima etapa de produção deve migrar o armazenamento para uma camada local protegida, adicionar bloqueio por biometria/PIN e implementar backup criptografado opcional.

Nenhuma previsão de ovulação ou período fértil deve ser apresentada como método contraceptivo, diagnóstico ou orientação médica.

## Próximas melhorias recomendadas

1. Separar o `index.html` em módulos de UI, domínio e persistência.
2. Migrar notificações web para notificações locais nativas do Android.
3. Migrar dados sensíveis do `localStorage` para armazenamento protegido.
4. Adicionar testes unitários para cálculo do ciclo e ciclos irregulares.
5. Criar ícone/splash nativos e preparar assinatura de release para Play Store.
