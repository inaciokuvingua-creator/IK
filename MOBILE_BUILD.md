# IK Finance — Guia de Build Mobile (Android & iOS)

## Pré-requisitos

### Para Android
- [Android Studio](https://developer.android.com/studio) instalado
- Android SDK (API 22+) configurado
- JDK 17+

### Para iOS
- macOS com [Xcode 14+](https://apps.apple.com/app/xcode/id497799835)
- CocoaPods: `sudo gem install cocoapods`
- Conta Apple Developer (para publicar na App Store)

---

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Primeira vez — inicializar o projeto nativo

```bash
npx cap add android
npx cap add ios
```

---

## 3. Build web + sincronizar com o projeto nativo

Sempre que fizer alterações no código web:

```bash
npm run mobile:sync
```

Isso executa `vite build` e depois `npx cap sync` para copiar os arquivos web para os projetos nativos.

---

## 4. Abrir e rodar no Android

```bash
npm run android
```

Isso abre o Android Studio com o projeto. Execute pelo emulador ou dispositivo físico.

**Ou rodar diretamente:**
```bash
npm run android:run
```

---

## 5. Abrir e rodar no iOS

```bash
npm run ios
```

Isso abre o Xcode com o projeto. Execute no Simulator ou dispositivo físico.

**Ou rodar diretamente:**
```bash
npm run ios:run
```

---

## 6. Configuração do App

O arquivo `capacitor.config.ts` na raiz contém:

| Campo | Valor |
|-------|-------|
| `appId` | `com.ikfinance.app` |
| `appName` | `IK Finance` |
| `webDir` | `dist` |
| `androidScheme` | `https` |

Altere o `appId` antes de publicar nas lojas.

---

## 7. Assets nativos

### Ícones
- Substitua os arquivos em `public/icon-*.png` por versões de alta qualidade (mínimo 512×512 px).
- Para Android: coloque o ícone em `android/app/src/main/res/mipmap-*/`
- Para iOS: use o Xcode > Assets.xcassets > AppIcon

### Splash Screen
- Instale o plugin: `npm install @capacitor/splash-screen`
- Adicione imagens em `android/app/src/main/res/drawable*/`
- Para iOS, configure em `ios/App/App/Assets.xcassets/`

---

## 8. Variáveis de ambiente

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são embutidas no bundle no momento do build (`vite build`). Não é necessária configuração adicional nos projetos nativos.

---

## 9. Publicação

### Google Play Store
1. `npm run build` → `npx cap sync`
2. Android Studio → Build → Generate Signed Bundle/APK
3. Upload no [Google Play Console](https://play.google.com/console)

### Apple App Store
1. `npm run build` → `npx cap sync`
2. Xcode → Product → Archive
3. Upload via Xcode Organizer ou Transporter

---

## 10. Estrutura de arquivos nativos (após `npx cap add`)

```
ik-finance/
├── android/          # Projeto Android (Gradle)
│   └── app/
│       └── src/main/
│           ├── assets/public/   ← arquivos web copiados aqui
│           └── res/             ← ícones, splash screens
├── ios/              # Projeto iOS (Xcode)
│   └── App/
│       └── public/              ← arquivos web copiados aqui
├── dist/             # Build web (gerado por `vite build`)
├── capacitor.config.ts
└── public/           # Assets PWA (ícones, manifest)
```
